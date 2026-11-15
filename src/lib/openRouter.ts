/**
 * OpenRouter AI client for generating CSV content based on template fields and user niche.
 *
 * Auto-selects a free available OpenRouter model using /api/v1/models.
 * Falls back to openrouter/free and then openrouter/auto if model discovery fails.
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

const MODEL_CACHE_KEY = "openrouter_selected_model";

/**
 * Safe fallback order:
 * 1. A discovered free model from /models
 * 2. OpenRouter free router
 * 3. OpenRouter auto router
 */
const FALLBACK_MODELS = ["openrouter/free", "openrouter/auto"] as const;

export interface CsvGenerationRequest {
  /** The user's niche or topic */
  niche: string;

  /** Template placeholder field names */
  fields: string[];

  /** Number of CSV rows to generate */
  rowCount: number;

  /** Optional template name for context */
  templateName?: string;

  /** Optional custom instructions from the user */
  customInstructions?: string;

  /**
   * Optional manual override.
   * Example: "openrouter/free", "openrouter/auto", "meta-llama/llama-3.2-3b-instruct:free"
   */
  model?: string;

  // ── YouTube SEO options ──────────────────────────────────────────────────
  /** Generate YouTube SEO columns alongside content (default: true) */
  youtubeOptimized?: boolean;

  /** Target audience for SEO optimization */
  targetAudience?: string;

  /** Content type: shorts, longform, or both */
  contentType?: "shorts" | "longform" | "both";

  /** Video language code (default: "en") */
  language?: string;

  /** Brand voice: professional, casual, humorous, etc. */
  brandVoice?: string;

  // ── Template context for better field relationships ──────────────────────
  /** Sample row from the selected CSV template (provides field relationship examples) */
  templateSample?: Record<string, string>;

  /** Content headers from the selected template (defines field roles) */
  templateContentHeaders?: string[];
}

export interface CsvGenerationResult {
  /** Generated CSV text */
  csv: string;

  /** Number of rows generated */
  rowCount: number;

  /** OpenRouter model used */
  modelUsed: string;
}

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string | null;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    image?: string;
    request?: string;
  };
  per_request_limits?: unknown;
}

interface OpenRouterModelsResponse {
  data?: OpenRouterModel[];
}

function getApiKey(): string {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return (
      localStorage.getItem("openrouter_api_key") ||
      process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
      ""
    );
  }

  return process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";
}

export function getOpenRouterApiKey(): string {
  return getApiKey();
}

export function setOpenRouterApiKey(key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("openrouter_api_key", key);
  }
}

function getCachedModel(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(MODEL_CACHE_KEY) || "";
}

function setCachedModel(model: string) {
  if (typeof window !== "undefined" && model) {
    localStorage.setItem(MODEL_CACHE_KEY, model);
  }
}

function clearCachedModel() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(MODEL_CACHE_KEY);
  }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function isZeroPrice(value?: string): boolean {
  if (value === undefined || value === null) return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === 0;
}

function isFreeModel(model: OpenRouterModel): boolean {
  const id = model.id.toLowerCase();

  if (id.includes(":free")) return true;
  if (id === "openrouter/free") return true;

  return (
    isZeroPrice(model.pricing?.prompt) &&
    isZeroPrice(model.pricing?.completion) &&
    isZeroPrice(model.pricing?.request)
  );
}

function isTextGenerationModel(model: OpenRouterModel): boolean {
  const outputModalities = model.architecture?.output_modalities || [];
  const inputModalities = model.architecture?.input_modalities || [];
  const modality = model.architecture?.modality || "";

  const outputsText =
    outputModalities.length === 0 ||
    outputModalities.includes("text") ||
    modality.includes("text");

  const acceptsText =
    inputModalities.length === 0 ||
    inputModalities.includes("text") ||
    modality.includes("text");

  return acceptsText && outputsText;
}

function scoreModel(model: OpenRouterModel): number {
  const id = model.id.toLowerCase();
  const name = (model.name || "").toLowerCase();
  let score = 0;

  // Prefer free explicit variants
  if (id.includes(":free")) score += 100;
  if (id === "openrouter/free") score += 90;

  // Good current free families for CSV/content generation
  if (id.includes("qwen")) score += 50;
  if (id.includes("deepseek")) score += 45;
  if (id.includes("llama")) score += 40;
  if (id.includes("mistral")) score += 35;
  if (id.includes("gemini")) score += 30;
  if (id.includes("openchat")) score += 25;

  // Prefer instruct/chat models
  if (id.includes("instruct")) score += 20;
  if (id.includes("chat")) score += 15;
  if (name.includes("instruct")) score += 10;

  // Prefer decent context length
  if ((model.context_length || 0) >= 32000) score += 15;
  else if ((model.context_length || 0) >= 16000) score += 10;
  else if ((model.context_length || 0) >= 8000) score += 5;

  // Avoid image/audio/specialized models for CSV text generation
  if (id.includes("vision")) score -= 20;
  if (id.includes("image")) score -= 30;
  if (id.includes("whisper")) score -= 50;
  if (id.includes("tts")) score -= 50;
  if (id.includes("embed")) score -= 50;

  return score;
}

async function fetchAvailableModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        typeof window !== "undefined"
          ? window.location.origin
          : "https://video-maker.app",
      "X-Title": "Video Maker - CSV Generator",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${response.status}`);
  }

  const data = (await response.json()) as OpenRouterModelsResponse;
  return Array.isArray(data.data) ? data.data : [];
}

async function selectBestOpenRouterModel(apiKey: string): Promise<string> {
  const cachedModel = getCachedModel();

  if (cachedModel) {
    return cachedModel;
  }

  try {
    const models = await fetchAvailableModels(apiKey);

    const bestFreeModel = models
      .filter(isFreeModel)
      .filter(isTextGenerationModel)
      .sort((a, b) => scoreModel(b) - scoreModel(a))[0];

    if (bestFreeModel?.id) {
      setCachedModel(bestFreeModel.id);
      return bestFreeModel.id;
    }
  } catch (error) {
    console.warn("OpenRouter model auto-select failed:", error);
  }

  setCachedModel(FALLBACK_MODELS[0]);
  return FALLBACK_MODELS[0];
}

/** Meaningful descriptions for common CSV field names. */
const FIELD_DESCRIPTIONS: Record<string, string> = {
  headline: "Main title text overlay on video. Keep under 60 chars. Use power words (Amazing, Secret, Why, How, Top). Create curiosity.",
  subheadline: "Secondary text that complements the headline. Keep under 100 chars. Provides context or builds on the headline.",
  cta: "Call-to-action button text. 2-3 words, action-oriented (e.g., Watch Now, Shop Now, Learn More, Subscribe).",
  quote: "Inspirational or notable quote. Keep under 150 chars. Use proper punctuation.",
  author: "Person who said the quote. Full name (e.g., Steve Jobs, Albert Einstein).",
  category: "Content category tag. Single word or short phrase (e.g., Motivation, Tech, Health, Finance).",
  step_number: "Current step number in a sequence. Numeric only (e.g., 1, 2, 3).",
  total_steps: "Total number of steps in the tutorial. Numeric only (e.g., 5, 10).",
  fact: "Interesting fact text. Keep under 100 chars. Make it surprising or counterintuitive.",
  fact_number: "Fact number in the countdown sequence. Numeric only.",
  days_left: "Days remaining for countdown or deadline. Numeric only.",
  brand: "Brand or company name. Use proper capitalization.",
  product_name: "Product name. Use proper capitalization and styling.",
  product_description: "Short product description. Keep under 100 chars. Highlight key features.",
  price: "Current sale price. Include currency symbol (e.g., $29, $99).",
  original_price: "Original price before discount. Include currency symbol.",
  tagline: "Brand tagline or slogan. Keep under 50 chars. Memorable and catchy.",
  discount: "Discount percentage or amount. Include % symbol (e.g., 50%, $20 off).",
  sale_price: "Discounted sale price. Include currency symbol.",
  time_left: "Time remaining. Use format HH:MM:SS or descriptive (e.g., 24 hours, 3 days).",
  promo_code: "Promotional code. UPPERCASE with no spaces (e.g., SAVE50, SUMMER2024).",
  option_a: "First option in a poll or comparison. Keep under 60 chars.",
  option_b: "Second option in a poll or comparison. Keep under 60 chars.",
  context: "Context or question for a poll/comparison. Keep under 100 chars.",
  stat_label: "Label for a statistic. UPPERCASE, short phrase (e.g., GLOBAL USERS, REVENUE).",
  big_number: "Large number or statistic. Use abbreviation (e.g., 2.7B, 1.5M, 100K).",
  unit: "Unit or context for the number (e.g., Active Users, Revenue, Downloads).",
  source: "Data source citation (e.g., Statista 2024, Internal Data).",
  episode: "Episode number. Numeric only.",
  guest_name: "Guest full name. Use proper capitalization.",
  guest_title: "Guest job title or role (e.g., CEO at TechForward, Author of Book X).",
  platform: "Platform name(s) (e.g., Spotify, Apple Podcasts, YouTube).",
  podcast_name: "Podcast show name. Use proper capitalization.",
  brand_name: "Brand or company name. Use proper capitalization.",
  year: "Year. Numeric only (e.g., 2019, 2024).",
  mission: "Mission statement. Keep under 150 chars. Clear and inspiring.",
  values: "Core values. Use separator (e.g., Innovation · Simplicity · Sustainability).",
  initials: "Person's initials. 2-3 uppercase letters (e.g., JD, AB).",
  name: "Person's full name. Use proper capitalization.",
  role: "Job title or role (e.g., Head of Design, CEO, Lead Developer).",
  bio: "Short biography. Keep under 150 chars. Highlight experience and expertise.",
  fun_fact: "Fun personal fact. Keep under 80 chars. Make it memorable and relatable.",
  social_handle: "Social media handle. Include @ prefix (e.g., @janedoe_design).",
};

function buildPrompts(request: CsvGenerationRequest) {
  const fields = request.fields.filter(
    (field) => field !== "serialNumber" && field !== "date"
  );

  const fieldList = fields.map((f) => `"${f}"`).join(", ");

  // Build field descriptions using the lookup map with fallback
  const fieldDescriptions = fields
    .map((f) => {
      const desc = FIELD_DESCRIPTIONS[f];
      if (desc) return `- ${f}: ${desc}`;
      // Fallback: split underscores and add generic guidance
      const parts = f.split("_");
      return `- ${f}: ${parts.join(" ")}. Keep concise, engaging, and SEO-friendly.`;
    })
    .join("\n");

  const youtubeOptimized = request.youtubeOptimized !== false;
  const contentType = request.contentType || "shorts";
  const language = request.language || "en";

  const youtubeColumnSpec = youtubeOptimized
    ? `

YOUTUBE SEO COLUMNS (include these in every CSV):
- video_title: YouTube title. Under 100 chars. Use power words (Amazing, Secret, Why, How, Top). Include relevant emoji. End with hook or curiosity gap.
- description: YouTube description. 150-300 chars. Start with a hook. Include 3-5 relevant hashtags. Add CTA (Subscribe, Like, Follow).
- tags: Comma-separated tags. 8-15 tags mixing broad + niche terms. Always include "${contentType === "shorts" ? "shorts" : contentType}" if applicable.
- hashtags: Space-separated hashtags (no # prefix). 3-5 trending + niche mix.
- category_id: YouTube category ID. Common: 22 (People & Blogs), 24 (Entertainment), 27 (Education), 26 (Howto & Style), 10 (Music), 23 (Comedy)
- visibility: Always "private" for review before publishing.
- made_for_kids: "false" unless specifically targeting children.
- language: "${language}"`
    : "";

  // Template context: provides field relationship examples
  const templateContext = request.templateSample && request.templateContentHeaders
    ? `\n\nTEMPLATE CONTEXT - FIELD RELATIONSHIPS:
This design uses a specific template. The content fields have specific ROLES in the design:
${request.templateContentHeaders.map(h => {
  const desc = FIELD_DESCRIPTIONS[h] || h;
  const example = request.templateSample![h] || "";
  return `- ${h}: ${desc}${example ? ` (Example: "${example}")` : ""}`;
}).join("\n")}

CRITICAL: Each field has a specific role in the video design. Generate data that:
1. Respects each field's role (e.g., CTA must be short action words, headline must be catchy)
2. Creates coherent relationships between fields (e.g., subheadline should complement headline)
3. Uses the example values as STYLE reference - match the tone and structure
4. Keeps field values within the character limits specified above`
    : "";

  const systemPrompt = `You are a professional content writer and YouTube SEO specialist. You generate CSV data for social media video templates.

IMPORTANT RULES:
1. Output ONLY valid CSV text. No markdown, no code blocks, no explanations.
2. First row MUST be the header row with field names exactly as specified.
3. Each subsequent row is one data entry.
4. Use proper CSV escaping: wrap values containing commas, quotes, or newlines in double quotes.
5. Make content engaging, viral-worthy, and optimized for YouTube Shorts, TikTok, and Reels.
6. Use the niche/topic to generate relevant, high-quality content.
7. Keep text short because these appear as text overlays on vertical videos.
8. For fields like "title" or "headline": keep under 60 characters and use power words.
9. For fields like "description", "subheadline", or "content": keep under 200 characters.
10. For numeric fields: use clean numbers only.
11. Do NOT include the serialNumber field in CSV. It is auto-generated.
12. Do NOT include the date field in CSV. It is auto-generated.
13. Return exactly ${request.rowCount} data rows.
14. Front-load important keywords in titles and descriptions.
15. Use numbers and lists when possible (Top 10, 5 Ways, 3 Secrets).
16. Create curiosity gaps to drive clicks.

CONTENT FIELD names to use as CSV headers: [${fieldList}]

Content field descriptions:
${fieldDescriptions}
${templateContext}
${youtubeColumnSpec}

SEO OPTIMIZATION RULES:
- Use keywords people actually search for in your niche
- Include long-tail keyword variations
- Match trending topics when possible
- Titles should create urgency or curiosity
- Descriptions should be informative yet concise
- Tags should mix high-volume and low-competition terms`;

  const userPrompt = `Generate ${request.rowCount} rows of CSV data for a "${
    request.niche
  }" ${request.templateName || "video"} template.

Requirements:
- Topic/Niche: ${request.niche}
- Number of rows: ${request.rowCount}
- Content type: ${contentType}
- Language: ${language}
${request.targetAudience ? `- Target audience: ${request.targetAudience}` : ""}
${request.brandVoice ? `- Brand voice: ${request.brandVoice}` : ""}
${request.customInstructions ? `- Additional instructions: ${request.customInstructions}` : ""}

Output the CSV with headers on the first row, then exactly ${
    request.rowCount
  } data rows. No markdown formatting.`;

  return {
    systemPrompt,
    userPrompt,
    fields,
  };
}

async function callOpenRouterChat(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        typeof window !== "undefined"
          ? window.location.origin
          : "https://video-maker.app",
      "X-Title": "Video Maker - CSV Generator",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: 0.8,
      max_tokens: params.maxTokens ?? 2500,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    let errorMsg = `OpenRouter API error: ${response.status}`;

    try {
      const parsed = JSON.parse(errorBody);
      errorMsg = parsed.error?.message || parsed.message || errorMsg;
    } catch {
      errorMsg = errorBody || errorMsg;
    }

    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Generate CSV content using OpenRouter AI.
 * Auto-selects a free model from OpenRouter /models.
 */
export async function generateCsvWithAI(
  request: CsvGenerationRequest
): Promise<CsvGenerationResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      "OpenRouter API key is required. Add NEXT_PUBLIC_OPENROUTER_API_KEY to .env.local or set it in the CSV panel."
    );
  }

  if (!request.fields.length) {
    throw new Error("No template fields found. Add placeholders before generating CSV.");
  }

  const { systemPrompt, userPrompt } = buildPrompts(request);

  const selectedModel =
    request.model?.trim() || (await selectBestOpenRouterModel(apiKey));

  const modelsToTry = [
    selectedModel,
    ...FALLBACK_MODELS.filter((model) => model !== selectedModel),
  ];

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const data = await callOpenRouterChat({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
      });

      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content returned from AI. Please try again.");
      }

      let csvContent = String(content).trim();

      // Remove markdown code fences if model returns them
      csvContent = csvContent
        .replace(/^```(?:csv)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();

      const lines = csvContent.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error(
          "AI returned insufficient data. Please try again with different instructions."
        );
      }

      setCachedModel(model);

      return {
        csv: csvContent,
        rowCount: lines.length - 1,
        modelUsed: model,
      };
    } catch (error) {
      console.warn(`OpenRouter model failed: ${model}`, error);
      lastError = error;

      // Cached model may be unavailable now, remove it before fallback.
      if (model === selectedModel) {
        clearCachedModel();
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All OpenRouter models failed. Please try again.");
}

// ─── Design JSON Generation ─────────────────────────────────────────────────

export interface DesignGenerationRequest {
  /** The user's niche or topic */
  niche: string;
  /** Number of pages/slides in the design */
  pageCount?: number;
  /** Optional custom instructions */
  customInstructions?: string;
  /** Optional manual model override */
  model?: string;
  /** Color scheme preference */
  colorScheme?: "dark" | "light" | "vibrant" | "pastel" | "neon";
}

export interface DesignGenerationResult {
  /** The generated BulkImageDesign JSON string */
  designJson: string;
  /** The generated AnimationPreset JSON string */
  animationPresetJson: string;
  /** Number of pages generated */
  pageCount: number;
  /** OpenRouter model used */
  modelUsed: string;
}

function buildDesignPrompts(request: DesignGenerationRequest) {
  const pageCount = request.pageCount || 3;
  const colorScheme = request.colorScheme || "dark";

  const colorGuidance: Record<string, string> = {
    dark: "Dark backgrounds (#0f172a, #1e1b4b, #0c0a09) with white/light text. Modern, premium feel.",
    light: "Light backgrounds (#f8fafc, #fffbeb, #fef3c7) with dark text. Clean, professional.",
    vibrant: "Bold, saturated backgrounds (#7c3aed, #dc2626, #0891b2) with white text. Energetic, eye-catching.",
    pastel: "Soft pastel backgrounds (#fdf2f8, #ede9fe, #ecfdf5) with dark text. Gentle, approachable.",
    neon: "Very dark backgrounds (#000000, #0a0a0a) with neon accent text (#00ff88, #ff0080, #00ffff). Cyberpunk, tech feel.",
  };

  const systemPrompt = `You are a professional graphic designer and motion designer specializing in social media video templates. You generate JSON design definitions AND animation presets for YouTube Shorts, TikTok, and Instagram Reels.

IMPORTANT RULES:
1. Output ONLY valid JSON. No markdown, no code blocks, no explanations.
2. The JSON must contain TWO top-level keys: "design" and "animationPreset".
3. Use 1080x1920 dimensions (vertical video format).
4. Each page should have 2-4 text elements with different sizes and positions.
5. Use {{placeholder}} syntax for text that should be replaced with CSV data.
6. Common placeholders: {{headline}}, {{subheadline}}, {{cta}}, {{fact}}, {{quote}}, {{author}}, {{category}}, {{step_number}}, {{total_steps}}.
7. Create visually balanced layouts with proper spacing.
8. Text should be readable on mobile devices (minimum 36px font size).
9. Use contrasting colors for text visibility.
10. Include decorative shapes (rectangles, lines) for visual interest.
11. Each page should have a different layout but consistent style.
12. VARY slide durations: first page 3500-5000ms, middle pages 3000-4500ms, last page 4000-6000ms (longer for ending).
13. VARY transitions between pages: mix "fade", "slide", "zoom_in", "zoom_out" for visual interest.
14. transitionDurationMs should be 400-800ms for smooth transitions.
15. ANIMATION PRESET MUST match the niche energy level.
16. Text entrance animations should be varied across pages for visual interest.

COLOR SCHEME: ${colorGuidance[colorScheme]}

SLIDE TIMING GUIDELINES:
- First page (intro): 3500-5000ms — longer to let viewers read the hook
- Middle pages (content): 3000-4500ms — varied for pacing
- Last page (CTA/ending): 4000-6000ms — longer for call-to-action to sink in
- Transitions: 400-800ms — fast enough to feel dynamic, slow enough to be smooth
- Mix transition types: fade for elegance, slide for movement, zoom for emphasis

OUTPUT JSON STRUCTURE:
{
  "design": {
    "id": "generated-1",
    "name": "Niche Design",
    "preset": "youtube_shorts",
    "width": 1080,
    "height": 1920,
    "pages": [
      {
        "id": "page-1",
        "name": "Hook/Intro",
        "backgroundColor": "#0f172a",
        "canvasBg": { "type": "solid", "color": "#0f172a" },
        "transitionIn": "fade",
        "transitionDurationMs": 500,
        "durationMs": 4000,
        "elements": [
          {
            "id": "el-1",
            "type": "text",
            "name": "Headline",
            "x": 90,
            "y": 600,
            "width": 900,
            "height": 200,
            "rotation": 0,
            "opacity": 1,
            "zIndex": 2,
            "text": "{{headline}}",
            "fontSize": 64,
            "fontWeight": 800,
            "color": "#ffffff",
            "align": "center",
            "lineHeight": 1.2,
            "backgroundColor": "transparent",
            "borderRadius": 0,
            "fontFamily": "Inter",
            "letterSpacing": 0
          },
          {
            "id": "el-2",
            "type": "rect",
            "name": "Accent Bar",
            "x": 440,
            "y": 580,
            "width": 200,
            "height": 8,
            "rotation": 0,
            "opacity": 1,
            "zIndex": 1,
            "fill": "#7c5cfc",
            "stroke": "transparent",
            "strokeWidth": 0,
            "borderRadius": 4
          }
        ]
      }
    ],
    "customFields": [
      { "id": "cf-1", "placeholder": "headline", "csvColumn": "", "defaultValue": "Amazing Fact", "label": "Headline" },
      { "id": "cf-2", "placeholder": "subheadline", "csvColumn": "", "defaultValue": "You won't believe this", "label": "Subheadline" }
    ]
  },
  "animationPreset": {
    "kenBurns": true,
    "kenBurnsDirection": "zoom-in",
    "kenBurnsIntensity": 0.05,
    "backgroundEffect": "particles",
    "backgroundOpacity": 0.3,
    "endingType": "fade-to-black",
    "endingDuration": 1500,
    "endingText": ""
  }
}

ANIMATION PRESET GUIDELINES:
- kenBurns: true for most niches, adds subtle zoom/pan motion
- kenBurnsDirection: "zoom-in" (immersive), "zoom-out" (revealing), "pan-left/right" (cinematic)
- kenBurnsIntensity: 0.03-0.08 (subtle), 0.1-0.15 (noticeable), 0.2+ (dramatic)
- backgroundEffect: "particles" (dreamy), "light-leak" (warm), "bokeh" (elegant), "none" (clean)
- backgroundOpacity: 0.1-0.5 (higher = more visible effect)
- endingType: "fade-to-black" (cinematic), "fade-to-white" (clean), "cta-overlay" (engagement), "none" (loop)
- endingText: CTA text like "Follow for more!" or "Subscribe!" when endingType is "cta-overlay"

NICHE-SPECIFIC ANIMATION RECOMMENDATIONS:
- Motivation/Quotes: zoom-in Ken Burns, particles background, cta-overlay ending
- Facts/Education: subtle zoom-in, bokeh background, fade-to-black ending
- Fitness: pan-left Ken Burns, light-leak background, cta-overlay ending
- Cooking: zoom-out Ken Burns, particles background, fade-to-white ending
- Tech: pan-right Ken Burns, bokeh background, fade-to-black ending
- Finance: subtle zoom-in, light-leak background, cta-overlay ending
- Health: zoom-in Ken Burns, particles background, fade-to-white ending
- Travel: pan-left Ken Burns, light-leak background, fade-to-black ending`;

  const userPrompt = `Generate a ${pageCount}-page video design template with animation preset for a "${request.niche}" content channel.

Requirements:
- Niche: ${request.niche}
- Pages: ${pageCount}
- Color scheme: ${colorScheme}
- Format: YouTube Shorts (1080x1920 vertical)
- Each page needs 2-4 text elements with {{placeholders}}
- Include decorative shapes (accent bars, background rectangles)
- Make it professional and visually appealing
- Choose animation preset that matches the niche energy level
${request.customInstructions ? `- Additional instructions: ${request.customInstructions}` : ""}

Output the complete JSON with "design" and "animationPreset" keys. No markdown formatting.`;

  return { systemPrompt, userPrompt };
}

/**
 * Generate a complete BulkImageDesign JSON using OpenRouter AI.
 */
export async function generateDesignJsonWithAI(
  request: DesignGenerationRequest
): Promise<DesignGenerationResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      "OpenRouter API key is required. Add NEXT_PUBLIC_OPENROUTER_API_KEY to .env.local or set it in the CSV panel."
    );
  }

  const { systemPrompt, userPrompt } = buildDesignPrompts(request);

  const selectedModel =
    request.model?.trim() || (await selectBestOpenRouterModel(apiKey));

  const modelsToTry = [
    selectedModel,
    ...FALLBACK_MODELS.filter((model) => model !== selectedModel),
  ];

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const data = await callOpenRouterChat({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        maxTokens: 4000,
      });

      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content returned from AI. Please try again.");
      }

      let designJson = String(content).trim();

      // Remove markdown code fences if model returns them
      designJson = designJson
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();

      // Validate JSON
      const parsed = JSON.parse(designJson);

      // Handle both formats: {design, animationPreset} or just design object
      let designData: any;
      let animationPresetData: any;

      if (parsed.design && parsed.animationPreset) {
        // New format: {design: {...}, animationPreset: {...}}
        designData = parsed.design;
        animationPresetData = parsed.animationPreset;
      } else if (parsed.pages) {
        // Legacy format: just the design object
        designData = parsed;
        animationPresetData = null;
      } else {
        throw new Error("Invalid design: missing pages array");
      }

      if (!designData.pages || !Array.isArray(designData.pages)) {
        throw new Error("Invalid design: missing pages array");
      }

      setCachedModel(model);

      return {
        designJson: JSON.stringify(designData),
        animationPresetJson: animationPresetData ? JSON.stringify(animationPresetData) : "",
        pageCount: designData.pages.length,
        modelUsed: model,
      };
    } catch (error) {
      console.warn(`OpenRouter model failed for design: ${model}`, error);
      lastError = error;

      if (model === selectedModel) {
        clearCachedModel();
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All OpenRouter models failed. Please try again.");
}