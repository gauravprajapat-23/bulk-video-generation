import { parseCsv } from "./csvParser";

export const FOOTBALL_QUIZ_ID = "football-legends-champions-gold";
export const QUIZ_FPS = 30;
export const QUIZ_WIDTH = 1920;
export const QUIZ_HEIGHT = 1080;

export type QuizQuestionType = "player_clue" | "career_path" | "award";
export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizAnswer = "A" | "B" | "C" | "D";
export type QuizPhaseKind = "intro" | "entrance" | "clues" | "countdown" | "suspense" | "reveal" | "transition" | "halftime" | "outro";

export interface FootballQuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options: [string, string, string, string];
  correctOption: QuizAnswer;
  explanation: string;
  difficulty: QuizDifficulty;
  thinkTimeSec: number;
  clues: string[];
  imageAssetId: string | null;
  revealImageAssetId: string | null;
  narration: string | null;
  source: string | null;
}

export interface FootballQuizSettings {
  templateId: typeof FOOTBALL_QUIZ_ID;
  theme: "champions_gold";
  fps: 30;
  width: 1920;
  height: 1080;
  introSeconds: number;
  halftimeSeconds: number;
  outroSeconds: number;
  defaultThinkSeconds: number;
  voiceover: boolean;
  revealStyle: "cinematic";
  title: string;
}

export interface FootballQuiz {
  settings: FootballQuizSettings;
  questions: FootballQuizQuestion[];
}

export interface QuizPhase {
  kind: QuizPhaseKind;
  startFrame: number;
  durationFrames: number;
  endFrame: number;
  questionIndex?: number;
}
export interface FootballQuizTimeline {
  phases: QuizPhase[];
  totalFrames: number;
  totalSeconds: number;
  width: 1920;
  height: 1080;
  fps: 30;
}

export const DEFAULT_FOOTBALL_QUIZ_SETTINGS: FootballQuizSettings = {
  templateId: FOOTBALL_QUIZ_ID,
  theme: "champions_gold",
  fps: QUIZ_FPS,
  width: QUIZ_WIDTH,
  height: QUIZ_HEIGHT,
  introSeconds: 18,
  halftimeSeconds: 12,
  outroSeconds: 15,
  defaultThinkSeconds: 10,
  voiceover: false,
  revealStyle: "cinematic",
  title: "Football Legends — Guess the Player",
};

export const QUIZ_CSV_COLUMNS = [
  "question_id", "question_type", "question", "option_a", "option_b",
  "option_c", "option_d", "correct_option", "explanation", "think_time_sec",
  "difficulty", "clues", "image_asset_id", "reveal_image_asset_id", "narration", "source",
] as const;

const ANSWERS = new Set(["A", "B", "C", "D"]);
const TYPES = new Set(["player_clue", "career_path", "award"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const REQUIRED = ["question_id", "question_type", "question", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation", "difficulty"];

function readOptional(value: string | undefined): string | null {
  return value?.trim() || null;
}

export function parseFootballQuizCsv(csv: string): FootballQuizQuestion[] {
  const parsed = parseCsv(csv, { maxRows: 50, maxColumns: 25, maxBytes: 2 * 1024 * 1024, maxCellChars: 3000 });
  for (const column of REQUIRED) {
    if (!parsed.headers.includes(column)) throw new Error("Missing quiz CSV column: " + column);
  }
  if (parsed.rows.length < 5 || parsed.rows.length > 50) {
    throw new Error("Football quiz requires between 5 and 50 questions");
  }
  const ids = new Set<string>();
  const questionTexts = new Set<string>();
  return parsed.rows.map((row, i) => {
    const n = i + 2;
    const id = row.question_id?.trim();
    const type = row.question_type?.trim();
    const difficulty = row.difficulty?.trim();
    const answer = row.correct_option?.trim().toUpperCase();
    const options = ["option_a", "option_b", "option_c", "option_d"].map((key) => row[key]?.trim() || "") as FootballQuizQuestion["options"];
    const question = row.question?.trim() || "";
    if (!id || !/^[a-zA-Z0-9_-]{1,50}$/.test(id) || ids.has(id)) throw new Error(`Invalid or repeated question ID at CSV row ${n}`);
    ids.add(id);
    if (!TYPES.has(type)) throw new Error(`Invalid question type at CSV row ${n}`);
    if (!DIFFICULTIES.has(difficulty)) throw new Error(`Invalid difficulty at CSV row ${n}`);
    if (!ANSWERS.has(answer)) throw new Error(`Invalid correct option at CSV row ${n}`);
    if (question.length < 10 || question.length > 250 || questionTexts.has(question.toLocaleLowerCase())) throw new Error(`Invalid or duplicated question at CSV row ${n}`);
    questionTexts.add(question.toLocaleLowerCase());
    if (options.some((x) => !x || x.length > 120) || new Set(options.map((x) => x.toLocaleLowerCase())).size !== 4) {
      throw new Error(`Four distinct non-empty options required at CSV row ${n}`);
    }
    const explanation = row.explanation?.trim() || "";
    if (explanation.length < 10 || explanation.length > 1000) throw new Error(`Explanation must contain 10–1000 characters at CSV row ${n}`);
    const seconds = row.think_time_sec?.trim() ? Number(row.think_time_sec.trim()) : 10;
    if (!Number.isInteger(seconds) || seconds < 5 || seconds > 20) throw new Error(`Countdown must be 5–20 whole seconds at CSV row ${n}`);
    const clues = (row.clues || "").split("|").map((s) => s.trim()).filter(Boolean);
    if (clues.length > 5 || clues.some((s) => s.length > 180)) throw new Error(`Invalid clues at CSV row ${n}`);
    return {
      id, type: type as QuizQuestionType, question, options, correctOption: answer as QuizAnswer,
      explanation, difficulty: difficulty as QuizDifficulty, thinkTimeSec: seconds,
      clues, imageAssetId: readOptional(row.image_asset_id),
      revealImageAssetId: readOptional(row.reveal_image_asset_id),
      narration: readOptional(row.narration), source: readOptional(row.source),
    };
  });
}

export function validateFootballQuiz(quiz: FootballQuiz): void {
  const s = quiz.settings;
  if (s.templateId !== FOOTBALL_QUIZ_ID || s.theme !== "champions_gold" ||
      s.fps !== QUIZ_FPS || s.width !== QUIZ_WIDTH || s.height !== QUIZ_HEIGHT ||
      s.revealStyle !== "cinematic") {
    throw new Error("Unsupported football quiz template configuration");
  }
  if (quiz.questions.length < 5 || quiz.questions.length > 50) throw new Error("Expected 5–50 quiz questions");
  for (const [key, seconds] of [["introSeconds", s.introSeconds], ["halftimeSeconds", s.halftimeSeconds], ["outroSeconds", s.outroSeconds]] as const) {
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 120) throw new Error(`Invalid ${key}`);
  }
  if (!Number.isInteger(s.defaultThinkSeconds) || s.defaultThinkSeconds < 5 || s.defaultThinkSeconds > 20) {
    throw new Error("Default countdown must be between 5 and 20 seconds");
  }
  if (typeof s.title !== "string" || !s.title.trim() || s.title.length > 120) throw new Error("Invalid title");
  if (typeof s.voiceover !== "boolean") throw new Error("Invalid voiceover setting");
  // Reuse CSV-style strict checks for imported JSON, not only CSV.
  const ids = new Set<string>();
  for (const [i, q] of quiz.questions.entries()) {
    if (!q.id || ids.has(q.id) || !TYPES.has(q.type) || !DIFFICULTIES.has(q.difficulty) ||
        !ANSWERS.has(q.correctOption) || !q.question.trim() ||
        q.options.length !== 4 || q.options.some((x) => !x.trim()) ||
        new Set(q.options.map((x) => x.trim().toLocaleLowerCase())).size !== 4 ||
        !q.explanation.trim() || !Number.isInteger(q.thinkTimeSec) ||
        q.thinkTimeSec < 5 || q.thinkTimeSec > 20) {
      throw new Error(`Invalid question at index ${i + 1}`);
    }
    ids.add(q.id);
  }
}

/** Deterministic contiguous frame segments, independent of rendering engine. */
export function compileFootballQuizTimeline(quiz: FootballQuiz): FootballQuizTimeline {
  validateFootballQuiz(quiz);
  const phases: QuizPhase[] = [];
  let frame = 0;
  const add = (kind: QuizPhaseKind, seconds: number, questionIndex?: number) => {
    const durationFrames = Math.round(seconds * QUIZ_FPS);
    phases.push({ kind, startFrame: frame, durationFrames, endFrame: frame + durationFrames,
      ...(questionIndex === undefined ? {} : { questionIndex }) });
    frame += durationFrames;
  };
  add("intro", quiz.settings.introSeconds);
  quiz.questions.forEach((q, index) => {
    add("entrance", 2, index);
    add("clues", 5, index);
    add("countdown", q.thinkTimeSec, index);
    add("suspense", 3, index);
    add("reveal", 4, index);
    add("transition", 1, index);
    if (index + 1 === Math.ceil(quiz.questions.length / 2) && quiz.questions.length >= 10) {
      add("halftime", quiz.settings.halftimeSeconds);
    }
  });
  add("outro", quiz.settings.outroSeconds);
  return { phases, totalFrames: frame, totalSeconds: frame / QUIZ_FPS,
    width: QUIZ_WIDTH, height: QUIZ_HEIGHT, fps: QUIZ_FPS };
}

export function makeFootballQuiz(questions: FootballQuizQuestion[], settings: Partial<FootballQuizSettings> = {}): FootballQuiz {
  const quiz = { settings: { ...DEFAULT_FOOTBALL_QUIZ_SETTINGS, ...settings }, questions };
  validateFootballQuiz(quiz);
  return quiz;
}
