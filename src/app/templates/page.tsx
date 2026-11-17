import Link from "next/link";
import { ArrowRight, Clock3, Trophy, Video } from "lucide-react";

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Video template studio</p>
        <h1 className="mt-2 font-sora text-2xl font-bold text-text">Professional Video Templates</h1>
        <p className="mt-2 text-sm text-muted">Start with a prepared layout, import your data and customize your video. Guest creation is supported.</p>
      </div>
      <Link href="/templates/football-quiz" className="group block overflow-hidden rounded-2xl border border-[#665331] bg-panel transition-colors hover:border-[#E9BB61]">
        <div className="relative flex min-h-[220px] flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-br from-[#071321] via-[#152E42] to-[#0B1A29] p-8 text-center">
          <div className="absolute -right-12 -top-24 h-56 w-56 rounded-full bg-[#E8BE66]/10 blur-3xl"/>
          <Trophy size={42} className="text-[#E9BB61]"/>
          <span className="text-xs font-bold tracking-[0.24em] text-[#E9BB61]">CHAMPIONS GOLD</span>
          <h2 className="font-sora text-3xl font-extrabold text-[#F3F6FA]">FOOTBALL LEGENDS QUIZ</h2>
          <span className="rounded-full border border-[#9E824C] bg-[#E9BB61]/10 px-3 py-1 text-xs font-semibold text-[#E9BB61]">WHO AM I?</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-bold text-text">Football Legends — Long-form YouTube Quiz</p>
            <p className="mt-1 flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1"><Video size={13}/> 1920 × 1080 · 30 FPS</span>
              <span className="flex items-center gap-1"><Clock3 size={13}/> 20 questions · ~9:05</span>
            </p>
            <p className="mt-2 text-xs text-muted">Multiple choice · Countdown · Career clues · Gold reveal · Halftime · Timeline export</p>
          </div>
          <span className="flex items-center gap-2 rounded-lg bg-[#D9AB58] px-4 py-2 text-sm font-bold text-[#111C2A] group-hover:bg-[#F0C77C]">Customize quiz <ArrowRight size={16}/></span>
        </div>
      </Link>
      <p className="text-xs text-muted">QUIZ-001 is an editable template foundation. Final video export will be connected in later rendering milestones.</p>
    </div>
  );
}
