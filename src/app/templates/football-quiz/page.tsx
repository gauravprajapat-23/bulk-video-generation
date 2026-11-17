"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, Download, Film, FileUp, ShieldCheck, Trophy } from "lucide-react";
import {
  compileFootballQuizTimeline,
  makeFootballQuiz,
  parseFootballQuizCsv,
  type FootballQuiz,
  type FootballQuizQuestion,
} from "@/lib/footballQuiz";

function clock(totalSeconds: number) {
  return `${Math.floor(totalSeconds / 60)}:${String(Math.floor(totalSeconds % 60)).padStart(2, "0")}`;
}

export default function FootballQuizTemplatePage() {
  const [quiz, setQuiz] = useState<FootballQuiz | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);
  const [voiceover, setVoiceover] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/templates/football-legends-quiz-20.csv")
      .then(async (response) => {
        if (!response.ok) throw new Error("Starter CSV could not be loaded");
        return response.text();
      })
      .then((text) => {
        if (active) setQuiz(makeFootballQuiz(parseFootballQuizCsv(text)));
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Unable to load starter template"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const timeline = useMemo(() => {
    if (!quiz) return null;
    try { return compileFootballQuizTimeline(quiz); }
    catch { return null; }
  }, [quiz]);

  async function handleUpload(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Quiz CSV exceeds 2 MB");
      const next = makeFootballQuiz(parseFootballQuizCsv(await file.text()), { voiceover });
      setQuiz(next);
      setSelected(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid quiz CSV");
    }
  }

  function updateQuestion(index: number, patch: Partial<FootballQuizQuestion>) {
    if (!quiz) return;
    const questions = quiz.questions.map((q, i) => i === index ? { ...q, ...patch } : q);
    setQuiz({ ...quiz, questions });
  }

  function downloadPlan() {
    if (!quiz || !timeline) return;
    try {
      const compiled = compileFootballQuizTimeline(quiz);
      const blob = new Blob([JSON.stringify({ ...quiz, timeline: compiled }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "football-legends-quiz-plan.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot export invalid quiz");
    }
  }

  const question = quiz?.questions[selected];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/templates" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-text"><ArrowLeft size={14}/> All templates</Link>
          <h1 className="font-sora text-2xl font-bold text-text">Football Legends Quiz</h1>
          <p className="mt-1 text-sm text-muted">Champions Gold · Professional long-form YouTube quiz · 1920 × 1080 · 30 FPS</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/templates/football-legends-quiz-20.csv" download className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-text hover:bg-panel2">Download sample CSV</a>
          <button type="button" onClick={downloadPlan} disabled={!timeline} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Download size={15}/> Export quiz timeline JSON</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-panel p-4"><p className="text-xs text-muted">Questions</p><p className="mt-1 font-sora text-2xl font-bold text-text">{quiz?.questions.length ?? "—"}</p></div>
        <div className="rounded-xl border border-border bg-panel p-4"><p className="text-xs text-muted">Estimated runtime</p><p className="mt-1 font-sora text-2xl font-bold text-text">{timeline ? clock(timeline.totalSeconds) : "—"}</p></div>
        <div className="rounded-xl border border-border bg-panel p-4"><p className="text-xs text-muted">Timeline events</p><p className="mt-1 font-sora text-2xl font-bold text-text">{timeline?.phases.length ?? "—"}</p></div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {loading && <p className="text-sm text-muted">Loading the football question set…</p>}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-panel p-4">
            <h2 className="font-semibold text-text">Question data</h2>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-accent/50 bg-accent/10 p-4 text-xs font-bold text-text hover:bg-accent/20">
              <FileUp size={17}/> Import quiz CSV
              <input aria-label="Import quiz CSV" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { void handleUpload(e.target.files?.[0]); e.target.value = ""; }}/>
            </label>
            <p className="mt-2 text-xs leading-relaxed text-muted">Accepts 5–50 validated questions. Changing the CSV replaces this draft only.</p>
            <label className="mt-4 flex items-center gap-2 text-xs text-text">
              <input type="checkbox" checked={voiceover} onChange={(e) => {
                const checked = e.target.checked;
                setVoiceover(checked);
                if (quiz) setQuiz({ ...quiz, settings: { ...quiz.settings, voiceover: checked } });
              }}/>
              Optional narration (requires audio setup in QUIZ-004)
            </label>
          </div>
          <div className="max-h-[480px] overflow-auto rounded-xl border border-border bg-panel p-3">
            <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted">Questions</h2>
            {quiz?.questions.map((q, index) => (
              <button type="button" key={q.id} onClick={() => setSelected(index)}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs ${index === selected ? "bg-accent text-white" : "text-muted hover:bg-panel2 hover:text-text"}`}>
                <span className="w-7 shrink-0 font-bold">{String(index + 1).padStart(2, "0")}</span>
                <span className="line-clamp-2">{q.question}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#3D4C50] bg-[#081723] p-4 text-[#F5F5F2] sm:p-8">
            <div className="flex items-center justify-between border-b border-[#394C55] pb-4">
              <p className="flex items-center gap-2 text-sm font-bold tracking-widest text-[#EDC16E]"><Trophy size={18}/> FOOTBALL LEGENDS</p>
              <p className="text-xs text-[#AAB9C7]">QUESTION {String(selected + 1).padStart(2,"0")} / {quiz?.questions.length ?? "—"}</p>
            </div>
            <div className="mx-auto flex min-h-[175px] max-w-2xl flex-col items-center justify-center gap-3 text-center sm:min-h-[240px]">
              <span className="rounded-full border border-[#A78244] bg-[#B9944B]/15 px-3 py-1 text-[10px] font-semibold tracking-widest text-[#EDC16E]">{question?.type.replace("_"," ").toUpperCase() ?? "WHO AM I?"}</span>
              <h2 className="font-sora text-xl font-extrabold sm:text-3xl">{question?.question ?? "Choose a question"}</h2>
              {question?.clues.length ? <p className="text-xs text-[#B5C6D2]">{question.clues.join("  •  ")}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {question?.options.map((value, index) => (
                <div key={index} className="flex items-center gap-3 rounded-xl border border-[#466174] bg-[#162D40] p-3 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D8AB59] text-xs font-extrabold text-[#172231]">{String.fromCharCode(65+index)}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3"><Clock3 size={18} className="text-[#EDC16E]"/><div className="h-2 flex-1 rounded-full bg-[#4C5D6A]"><div className="h-full w-3/4 rounded-full bg-[#E1B45B]"/></div></div>
              <span className="font-bold text-[#EDC16E]">{question?.thinkTimeSec ?? 10}s</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-accent"/><h2 className="font-semibold text-text">Edit selected question</h2></div>
            {question && (
              <div className="space-y-3">
                <label className="block space-y-1 text-xs text-muted">Question text
                  <textarea value={question.question} onChange={(e)=>updateQuestion(selected,{question:e.target.value})} rows={2}
                    className="w-full rounded-lg border border-border bg-bg p-2 text-sm text-text"/>
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((value,index)=><label key={index} className="block space-y-1 text-xs text-muted">Option {String.fromCharCode(65+index)}
                    <input value={value} onChange={(e)=>{const options=[...question.options] as FootballQuizQuestion["options"];options[index]=e.target.value;updateQuestion(selected,{options});}}
                      className="w-full rounded-lg border border-border bg-bg p-2 text-sm text-text"/>
                  </label>)}
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="space-y-1 text-xs text-muted">Correct answer
                    <select value={question.correctOption} onChange={(e)=>updateQuestion(selected,{correctOption:e.target.value as FootballQuizQuestion["correctOption"]})} className="block rounded-lg border border-border bg-bg p-2 text-sm text-text">
                      {["A","B","C","D"].map(x=><option key={x} value={x}>{x}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-muted">Countdown
                    <select value={question.thinkTimeSec} onChange={(e)=>updateQuestion(selected,{thinkTimeSec:Number(e.target.value)})} className="block rounded-lg border border-border bg-bg p-2 text-sm text-text">
                      {[5,8,10,15,20].map(x=><option key={x} value={x}>{x}s</option>)}
                    </select>
                  </label>
                </div>
                <label className="block space-y-1 text-xs text-muted">Reveal explanation
                  <textarea value={question.explanation} onChange={(e)=>updateQuestion(selected,{explanation:e.target.value})} rows={2} className="w-full rounded-lg border border-border bg-bg p-2 text-sm text-text"/>
                </label>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-xs leading-relaxed text-muted">
        <Film className="mr-2 inline-block text-accent" size={16}/>
        <strong className="text-text">QUIZ-001 foundation:</strong> This is the editable quiz data and timeline preview, not an exported video. Frame-based animations, sound, and final MP4 rendering are upcoming QUIZ-002 through QUIZ-005 milestones.
      </div>
    </div>
  );
}
