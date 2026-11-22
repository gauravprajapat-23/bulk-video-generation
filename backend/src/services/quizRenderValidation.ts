import type { Request } from "express";

export type QuizPhaseKind = "intro" | "entrance" | "clues" | "countdown" | "suspense" | "reveal" | "transition" | "halftime" | "outro";
export interface RenderQuizQuestion {
  id: string;
  type: "player_clue" | "career_path" | "award";
  question: string;
  options: [string, string, string, string];
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  thinkTimeSec: number;
  clues: string[];
}
export interface RenderQuiz {
  settings: { templateId: string; theme: string; title: string; fps: number; width: number; height: number;
    introSeconds: number; halftimeSeconds: number; outroSeconds: number; defaultThinkSeconds: number; revealStyle: string; voiceover: boolean };
  questions: RenderQuizQuestion[];
}
export interface RenderQuizPhase {kind: QuizPhaseKind; startFrame: number; endFrame: number; durationFrames: number; questionIndex?: number }
export interface RenderQuizTimeline { phases: RenderQuizPhase[]; totalFrames: number; fps: 30; width: 1920; height: 1080 }

const TYPES = new Set(["player_clue", "career_path", "award"]);
const DIFFICULTY = new Set(["easy", "medium", "hard"]);
const ANSWERS = new Set(["A", "B", "C", "D"]);
function str(v: unknown, max: number): v is string { return typeof v === "string" && v.trim().length > 0 && v.length <= max; }
function count(v: unknown, max: number): v is number { return Number.isInteger(v) && typeof v === "number" && v >= 0 && v <= max; }

/** Server validates untrusted JSON independently of the frontend. Never trust a client timeline. */
export function parseRenderQuiz(input: unknown): { quiz: RenderQuiz; timeline: RenderQuizTimeline } {
  if (!input || typeof input !== "object") throw new Error("Invalid quiz");
  const raw = input as Record<string, any>;
  const s = raw.settings;
  if (!s || s.templateId !== "football-legends-champions-gold" || s.theme !== "champions_gold" ||
      s.fps !== 30 || s.width !== 1920 || s.height !== 1080 || s.revealStyle !== "cinematic" ||
      !str(s.title, 120) || typeof s.voiceover !== "boolean" ||
      !count(s.introSeconds, 120) || !count(s.halftimeSeconds, 120) || !count(s.outroSeconds, 120) ||
      !count(s.defaultThinkSeconds, 20) || s.defaultThinkSeconds < 5) throw new Error("Invalid quiz settings");
  if (!Array.isArray(raw.questions) || raw.questions.length < 5 || raw.questions.length > 20) {
    throw new Error("Guest MP4 export supports 5–20 questions");
  }
  const ids = new Set<string>(), prompts = new Set<string>();
  const questions: RenderQuizQuestion[] = raw.questions.map((q: any) => {
    if (!q || !str(q.id, 50) || !/^[\w-]+$/.test(q.id) || ids.has(q.id) ||
      !TYPES.has(q.type) || !DIFFICULTY.has(q.difficulty) ||
      !str(q.question, 250) || q.question.length < 10 ||
      prompts.has(q.question.trim().toLowerCase()) || !str(q.explanation, 1000) || q.explanation.length < 10 ||
      !ANSWERS.has(q.correctOption) || !count(q.thinkTimeSec, 20) || q.thinkTimeSec < 5 ||
      !Array.isArray(q.options) || q.options.length !== 4 ||
      q.options.some((x: unknown) => !str(x, 120)) ||
      new Set(q.options.map((x: string) => x.trim().toLowerCase())).size !== 4 ||
      !Array.isArray(q.clues) || q.clues.length > 5 || q.clues.some((x: unknown) => !str(x, 180))) {
      throw new Error("Invalid question, answer, countdown or clue");
    }
    ids.add(q.id); prompts.add(q.question.trim().toLowerCase());
    return {id:q.id, type:q.type, question:q.question, options:q.options,
      correctOption:q.correctOption, explanation:q.explanation, difficulty:q.difficulty,
      thinkTimeSec:q.thinkTimeSec, clues:q.clues };
  });
  const quiz: RenderQuiz = { settings: {templateId:s.templateId, theme:s.theme, title:s.title,
    fps:30,width:1920,height:1080,introSeconds:s.introSeconds,halftimeSeconds:s.halftimeSeconds,
    outroSeconds:s.outroSeconds,defaultThinkSeconds:s.defaultThinkSeconds,revealStyle:s.revealStyle,
    voiceover:s.voiceover}, questions};
  const phases: RenderQuizPhase[] = [];
  let frame=0;
  const add=(kind:QuizPhaseKind, seconds:number, questionIndex?:number)=>{
    const durationFrames=seconds*30;
    if (durationFrames > 0) {
      phases.push({kind,startFrame:frame,endFrame:frame+durationFrames,durationFrames,
        ...(questionIndex===undefined?{}:{questionIndex})});
    }
    frame+=durationFrames;
  };
  add("intro",s.introSeconds);
  questions.forEach((q,i)=>{
    add("entrance",2,i); add("clues",5,i); add("countdown",q.thinkTimeSec,i);
    add("suspense",3,i); add("reveal",4,i); add("transition",1,i);
    if (i+1===Math.ceil(questions.length/2) && questions.length>=10) add("halftime",s.halftimeSeconds);
  });
  add("outro",s.outroSeconds);
  if (frame > 30*60*12) throw new Error("Guest render exceeds 12 minute limit");
  return {quiz,timeline:{phases,totalFrames:frame,fps:30,width:1920,height:1080}};
}

/** Format checks only; never fetch media from URLs passed by an anonymous caller. */
export function validateGuestMusic(data: Buffer, mime: string): void {
  if (!data.length || data.length > 12*1024*1024) throw new Error("Music file is empty or too large");
  const mp3 = (data.toString("ascii",0,3)==="ID3" || (data[0]===0xff && (data[1]&0xe0)===0xe0));
  const wav = data.toString("ascii",0,4)==="RIFF" && data.toString("ascii",8,12)==="WAVE";
  const ogg = data.toString("ascii",0,4)==="OggS";
  const mp4 = data.toString("ascii",4,8)==="ftyp";
  if (!(mp3 || wav || ogg || mp4) || !["audio/mpeg","audio/wav","audio/x-wav","audio/ogg","audio/mp4"].includes(mime))
    throw new Error("Unsupported music signature or MIME type");
}
