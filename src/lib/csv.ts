export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function normalizeHeader(header: string, fallbackIndex: number): string {
  const trimmed = header.trim();
  return trimmed || `column_${fallbackIndex + 1}`;
}

export function parseCsv(input: string): ParsedCsv {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      current = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map(normalizeHeader);
  const dataRows = rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });

  return { headers, rows: dataRows };
}

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function createCsv(headers: string[], rows: Record<string, string>[]): string {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
  ].join("\n");
}

// ── Unified CSV validation ────────────────────────────────────────────────────

import type {
  CsvColumnCategory,
  CsvValidationResult,
  SeoScoreResult,
} from "./bulkImageTypes";
import { CSV_COLUMN_CATEGORIES, SEO_REQUIRED_FIELDS } from "./bulkImageTypes";

/** Detect the category of a CSV column header. */
export function detectColumnCategory(header: string): CsvColumnCategory {
  return CSV_COLUMN_CATEGORIES[header.trim().toLowerCase()] || "unknown";
}

/** Validate a parsed CSV file against the unified format. */
export function validateUnifiedCsv(parsed: ParsedCsv): CsvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seoScores: SeoScoreResult[] = [];

  let contentColumns = 0;
  let seoColumns = 0;
  let schedulingColumns = 0;
  let brandingColumns = 0;

  for (const header of parsed.headers) {
    const cat = detectColumnCategory(header);
    if (cat === "content") contentColumns++;
    else if (cat === "seo") seoColumns++;
    else if (cat === "scheduling") schedulingColumns++;
    else if (cat === "branding") brandingColumns++;
  }

  // Check required SEO columns
  for (const required of SEO_REQUIRED_FIELDS) {
    if (!parsed.headers.includes(required)) {
      errors.push(`Missing required SEO column: "${required}"`);
    }
  }

  // Validate each row
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const rowErrors: string[] = [];

    // Check required fields
    if (!row.video_title?.trim() && !row.title?.trim()) {
      rowErrors.push("Missing video_title or title");
    } else if ((row.video_title || row.title || "").length > 100) {
      rowErrors.push(`Title too long (${(row.video_title || row.title || "").length}/100 chars)`);
    }

    if (!row.description?.trim()) {
      rowErrors.push("Missing description");
    } else if (row.description.length > 5000) {
      rowErrors.push(`description too long (${row.description.length}/5000 chars)`);
    }

    if (!row.tags?.trim()) {
      rowErrors.push("Missing tags");
    } else if (row.tags.length > 500) {
      rowErrors.push(`tags too long (${row.tags.length}/500 chars)`);
    }

    // Validate visibility
    if (row.visibility && !["private", "unlisted", "public"].includes(row.visibility)) {
      rowErrors.push(`Invalid visibility: "${row.visibility}"`);
    }

    // Validate publish_at if present
    if (row.publish_at) {
      const date = new Date(row.publish_at);
      if (Number.isNaN(date.getTime())) {
        rowErrors.push(`Invalid publish_at: "${row.publish_at}"`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join("; ")}`);
    }

    // Score SEO
    seoScores.push(scoreCsvSeo(row));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows: parsed.rows.length,
      contentColumns,
      seoColumns,
      schedulingColumns,
      brandingColumns,
    },
    seoScores,
  };
}

/** Score a single CSV row for YouTube SEO quality (0-100). */
export function scoreCsvSeo(row: Record<string, string>): SeoScoreResult {
  let score = 0;
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Title scoring (30 pts)
  const title = row.video_title || row.title || "";
  if (title) {
    score += 10;
    const titleLen = title.length;
    if (titleLen >= 40 && titleLen <= 70) {
      score += 20; // optimal length
    } else if (titleLen > 70 && titleLen <= 100) {
      score += 10;
      suggestions.push("Title could be shorter (40-70 chars optimal)");
    } else if (titleLen > 100) {
      issues.push("Title exceeds 100 char limit");
    } else if (titleLen < 20) {
      score += 5;
      suggestions.push("Title is very short — add more descriptive words");
    } else {
      score += 10;
    }
  } else {
    issues.push("Missing video_title");
  }

  // Description scoring (25 pts)
  const desc = row.description || "";
  if (desc) {
    score += 5;
    const descLen = desc.length;
    if (descLen >= 150 && descLen <= 300) {
      score += 20; // optimal
    } else if (descLen >= 100 && descLen < 150) {
      score += 12;
      suggestions.push("Description could be longer (150-300 chars optimal)");
    } else if (descLen > 300 && descLen <= 500) {
      score += 15;
    } else if (descLen > 500) {
      score += 10;
      suggestions.push("Description is very long — YouTube may truncate it");
    } else if (descLen > 0) {
      score += 5;
      suggestions.push("Description is too short — add more detail");
    }

    // Check for CTA
    const ctaKeywords = ["subscribe", "like", "follow", "comment", "share", "watch"];
    if (ctaKeywords.some((kw) => desc.toLowerCase().includes(kw))) {
      score += 5;
    } else {
      suggestions.push("Add a CTA (Subscribe, Like, Follow) to description");
    }
  } else {
    issues.push("Missing description");
  }

  // Tags scoring (20 pts)
  const tags = row.tags || "";
  if (tags) {
    const tagList = tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    score += 5;

    if (tagList.length >= 5 && tagList.length <= 15) {
      score += 15; // optimal
    } else if (tagList.length >= 3 && tagList.length < 5) {
      score += 8;
      suggestions.push("Add more tags (5-15 optimal)");
    } else if (tagList.length > 15) {
      score += 10;
      suggestions.push("Too many tags — YouTube may ignore some");
    } else if (tagList.length > 0) {
      score += 3;
      suggestions.push("Add more tags for better discoverability");
    }

    // Check for "shorts" tag
    if (tagList.some((t: string) => t.toLowerCase() === "shorts")) {
      score += 5;
    } else {
      suggestions.push('Add "shorts" tag if this is a Short');
    }
  } else {
    issues.push("Missing tags");
  }

  // Hashtags scoring (15 pts)
  const hashtags = row.hashtags || "";
  if (hashtags) {
    const tagList = hashtags.split(/\s+/).filter(Boolean);
    score += 5;
    if (tagList.length >= 3 && tagList.length <= 5) {
      score += 10;
    } else if (tagList.length > 5) {
      score += 5;
      suggestions.push("Too many hashtags — keep 3-5 for best results");
    } else {
      score += 3;
      suggestions.push("Add 3-5 hashtags for better discoverability");
    }
  } else {
    suggestions.push("Add hashtags (3-5) to description for better reach");
  }

  // Bonus: category_id present (5 pts)
  if (row.category_id) {
    score += 5;
  } else {
    suggestions.push("Add category_id for better YouTube categorization");
  }

  // Bonus: language present (5 pts)
  if (row.language) {
    score += 5;
  } else {
    suggestions.push("Add language code for accessibility");
  }

  return { score: Math.min(100, score), issues, suggestions };
}
