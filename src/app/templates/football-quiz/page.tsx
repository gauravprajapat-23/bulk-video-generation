"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Film, FileUp, ShieldCheck, Play, Pause, RotateCcw } from "lucide-react";
import { ChampionsGoldScene } from "@/components/quiz/ChampionsGoldScene";
import { locateFootballQuizFrame, readableQuizPhase } from "@/lib/footballQuizPlayback";
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
  const [previewFrame, setPreviewFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

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

  const scene = useMemo(() => timeline ? locateFootballQuizFrame(timeline, previewFrame) : null, [timeline, previewFrame]);

  useEffect(() => {
    if (!timeline || !playing) return;
    let animationFrame = 0;
    let lastTime = 0;
    let carry = 0;
    const tick = (now: number) => {
      if (!lastTime) lastTime = now;
      carry += Math.min(100, now - lastTime) * timeline.fps / 1000;
      lastTime = now;
      const advance = Math.floor(carry);
      if (advance > 0) {
        carry -= advance;
        setPreviewFrame((frame) => {
          const next = frame + advance;
          if (next >= timeline.totalFrames) {
            setPlaying(false);
            return timeline.totalFrames - 1;
          }
          return next;
        });
      }
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [playing, timeline]);

  async function handleUpload(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Quiz CSV exceeds 2 MB");
      const next = makeFootballQuiz(parseFootballQuizCsv(await file.text()), { voiceover });
      setQuiz(next);
      setSelected(0);
      setPreviewFrame(0);
      setPlaying(false);
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
  const liveQuestion = scene?.phase.questionIndex === undefined ? null : quiz?.questions[scene.phase.questionIndex] || null;
  const liveQuestionIndex = scene?.phase.questionIndex ?? 0;
  const previewSeconds = scene ? scene.frame / 30 : 0;

  function seekQuestion(index: number) {
    setSelected(index);
    if (!timeline) return;
    const target = timeline.phases.find((p) => p.questionIndex === index && p.kind === "entrance");
    if (target) setPreviewFrame(target.startFrame);
    setPlaying(false);
  }

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
              <button type="button" key={q.id} onClick={() => seekQuestion(index)}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs ${index === selected ? "bg-accent text-white" : "text-muted hover:bg-panel2 hover:text-text"}`}>
                <span className="w-7 shrink-0 font-bold">{String(index + 1).padStart(2, "0")}</span>
                <span className="line-clamp-2">{q.question}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-border bg-panel p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">Champions Gold — Scene Preview</p>
                <p className="text-xs text-muted">Frame-based browser preview. This is not an MP4 export.</p>
              </div>
              <span className="rounded-full border border-[#b69454]/50 bg-[#ab8a4b]/10 px-3 py-1 text-xs font-semibold text-[#f0c87d]">
                {scene ? readableQuizPhase(scene.phase.kind) : "Awaiting quiz"}
              </span>
            </div>
            <ChampionsGoldScene
              question={liveQuestion}
              questionIndex={liveQuestionIndex}
              questionCount={quiz?.questions.length ?? 20}
              phase={scene?.phase.kind ?? "intro"}
              progress={scene?.progress ?? 0}
              remainingSeconds={scene?.remainingSeconds ?? 0}
              title={quiz?.settings.title ?? "Football Legends Quiz"}
            />
            <div className="flex items-center gap-2">
              <button type="button" aria-label={playing ? "Pause preview" : "Play preview"} disabled={!timeline} onClick={() => {
                if (timeline && previewFrame >= timeline.totalFrames - 1) setPreviewFrame(0);
                setPlaying((value) => !value);
              }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D8AE64] text-[#11202C] disabled:opacity-40">
                {playing ? <Pause size={17}/> : <Play size={17}/>}
              </button>
              <button type="button" aria-label="Restart preview" disabled={!timeline} onClick={() => {setPlaying(false);setPreviewFrame(0);}} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-text disabled:opacity-40"><RotateCcw size={15}/></button>
              <input aria-label="Scrub quiz timeline" type="range" min={0} max={Math.max(1,(timeline?.totalFrames ?? 1)-1)} step={1} value={Math.min(previewFrame,Math.max(0,(timeline?.totalFrames ?? 1)-1))}
                onChange={(event)=>{setPlaying(false);setPreviewFrame(Number(event.target.value));}}
                className="min-w-0 flex-1 accent-[#D8AE64]" disabled={!timeline}/>
              <span className="min-w-[90px] text-right text-xs font-semibold tabular-nums text-text">{clock(previewSeconds)} / {clock(timeline?.totalSeconds ?? 0)}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Seek through the intro, clues, countdown, suspense, reveal and halftime scenes. Playback is silent; future milestones add polished motion and synced audio.
            </p>
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
        <strong className="text-text">QUIZ-001 foundation:</strong> The new Champions Gold visual preview is driven by the frame timeline. Final motion rendering, sound, and playable MP4 export remain the upcoming QUIZ-003 through QUIZ-005 milestones.
      </div>
    </div>
  );
}
