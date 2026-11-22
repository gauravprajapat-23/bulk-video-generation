export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function normalizeHeader(header: string, fallbackIndex: number): string {
  const trimmed = header.trim();
  return trimmed || `column_${fallbackIndex + 1}`;
}

export interface CsvParseLimits {
  maxBytes?: number;
  maxRows?: number;
  maxColumns?: number;
  maxCellChars?: number;
}
export const DEFAULT_CSV_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxRows: 10000,
  maxColumns: 100,
  maxCellChars: 20000,
} as const;

/**
 * Strict RFC-style CSV parser with explicit bounds. Quoted newlines and escaped
 * quotes are supported; malformed or oversized input fails before mutation.
 */
export function parseCsv(input: string, limits: CsvParseLimits = {}): ParsedCsv {
  const opts = { ...DEFAULT_CSV_LIMITS, ...limits };
  if (Object.values(opts).some((n) => !Number.isSafeInteger(n) || n <= 0)) {
    throw new Error("Invalid CSV import limits");
  }
  if (input.length > opts.maxBytes || new TextEncoder().encode(input).length > opts.maxBytes) {
    throw new Error("CSV exceeds size limit");
  }
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  let atFieldStart = true;
  let rowNumber = 1;
  const pushField = () => {
    if (row.length >= opts.maxColumns) throw new Error("CSV exceeds column limit");
    row.push(field);
    field = "";
    afterQuote = false;
    atFieldStart = true;
  };
  const pushRow = () => {
    if (row.some((cell) => cell.trim() !== "")) {
      if (records.length > opts.maxRows) throw new Error("CSV exceeds row limit");
      records.push(row);
    }
    row = [];
    rowNumber++;
  };
  const append = (value: string) => {
    field += value;
    if (field.length > opts.maxCellChars) throw new Error("CSV cell exceeds length limit");
  };

  const text = input.charCodeAt(0) === 0xFEFF ? input.slice(1) : input;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"') {
        if (next === '"') { append('"'); i++; }
        else { quoted = false; afterQuote = true; }
      } else append(ch);
    } else if (afterQuote) {
      if (ch === ",") pushField();
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && next === "\n") i++;
        pushField();
        pushRow();
      } else if (ch !== " " && ch !== "\t") {
        throw new Error("Unexpected text after quoted CSV field at row " + rowNumber);
      }
    } else if (ch === '"') {
      if (!atFieldStart) throw new Error("Unexpected quote at CSV row " + rowNumber);
      quoted = true;
      atFieldStart = false;
    } else if (ch === ",") pushField();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i++;
      pushField();
      pushRow();
    } else { append(ch); atFieldStart = false; }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field");
  pushField();
  pushRow();
  if (!records.length) return { headers: [], rows: [] };
  const headers = records[0].map(normalizeHeader);
  if (new Set(headers.map((h) => h.toLowerCase())).size !== headers.length) {
    throw new Error("Duplicate CSV headers");
  }
  const dataRows = records.slice(1).map((cells, i) => {
    if (cells.length > headers.length) throw new Error("Too many columns at CSV row " + (i + 2));
    const record: Record<string, string> = Object.create(null);
    headers.forEach((header, index) => { record[header] = (cells[index] ?? "").trim(); });
    return record;
  });
  return { headers, rows: dataRows };
}

