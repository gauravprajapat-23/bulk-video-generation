"use client";

import type { FootballQuizQuestion, QuizPhaseKind } from "@/lib/footballQuiz";
import { Trophy, Check, Sparkles } from "lucide-react";
import { getFootballQuizMotion, ringDashArray } from "@/lib/footballQuizMotion";

export interface ChampionsGoldSceneProps {
  question: FootballQuizQuestion | null;
  questionIndex: number;
  questionCount: number;
  phase: QuizPhaseKind;
  progress: number;
  remainingSeconds: number;
  title: string;
}

function StadiumBackdrop({ x, opacity }: { x: number; opacity: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_10%,#284c5d_0%,#0b1b2b_45%,#07121f_100%)]"/>
      <div style={{ opacity, transform: `translateX(${x}%) rotate(-25deg)` }} className="absolute -left-[15%] top-[-10%] h-[45%] w-[62%] bg-[linear-gradient(90deg,transparent,rgba(217,178,96,0.16),transparent)] blur-2xl"/>
      <div style={{ opacity, transform: `translateX(${-x}%) rotate(25deg)` }} className="absolute -right-[15%] top-[-10%] h-[45%] w-[62%] bg-[linear-gradient(90deg,transparent,rgba(217,178,96,0.14),transparent)] blur-2xl"/>
      <div className="absolute inset-x-0 bottom-[8%] h-[32%] rounded-[50%] border-t border-[#b7d5df]/20 bg-[radial-gradient(ellipse_at_50%_100%,rgba(28,78,65,0.8),rgba(6,20,33,0))]"/>
      <div className="absolute inset-x-[10%] bottom-[8%] h-[20%] rounded-[50%] border-t border-[#9bb3c6]/10"/>
      <div className="absolute inset-x-[17%] bottom-[8%] h-[16%] rounded-[50%] border-t border-[#a6c9b8]/10"/>
      <div className="absolute inset-x-[7%] bottom-[11%] h-px bg-gradient-to-r from-transparent via-[#9aafac]/20 to-transparent"/>
      <div className="absolute inset-x-0 bottom-0 h-[17%] bg-gradient-to-t from-[#07111b] to-transparent"/>
    </div>
  );
}

function PlayerSilhouette({ revealed }: { revealed: boolean }) {
  return (
    <div aria-label={revealed ? "Answer phase: stylized silhouette, player photo not available" : "Mystery player silhouette"} className="quiz-gold-player relative mx-auto flex aspect-[4/3] w-full max-w-[240px] items-end justify-center overflow-hidden rounded-2xl border border-[#c4a05e]/40 bg-[#112a3a] shadow-[inset_0_0_35px_#06121d]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(235,186,93,0.2),transparent_60%)]"/>
      <svg viewBox="0 0 320 240" className="relative w-full" role="img" aria-label="Generic player silhouette, not an actual player photo">
        <ellipse cx="160" cy="75" rx="39" ry="44" fill="#06111d" stroke="#d5ae60" strokeOpacity=".25" strokeWidth="2"/>
        <path d="M125 114 C106 120 72 122 60 164 L40 240 L280 240 L260 164 C248 122 213 120 195 114 C186 138 135 140 125 114 Z" fill="#06111d" stroke="#d5ae60" strokeOpacity=".25" strokeWidth="2"/>
        <path d="M160 134 L160 238" stroke="#d5ae60" strokeOpacity=".14" strokeWidth="2"/>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-7xl font-black text-[#ebc476]/90 drop-shadow-[0_0_20px_rgba(237,196,111,0.5)]">{revealed ? "★" : "?"}</span>
    </div>
  );
}

/** 16:9 responsive visual scene; scene state is wholly derived from the timeline frame. */
export function ChampionsGoldScene({ question, questionIndex, questionCount, phase, progress, remainingSeconds, title }: ChampionsGoldSceneProps) {
  const showQuestion = !["intro", "halftime", "outro"].includes(phase);
  const motion = getFootballQuizMotion(phase, progress, remainingSeconds);
  const revealed = motion.answerVisible;
  const showOptions = ["countdown", "suspense", "reveal", "transition"].includes(phase);
  const options = question?.options || ["", "", "", ""];
  const shownClues = phase === "clues"
    ? Math.min(question?.clues.length || 0, Math.max(1, Math.ceil(progress * (question?.clues.length || 0))))
    : (question?.clues.length || 0);
  const countdownProgress = motion.timerFraction;

  return (
    <div data-testid="champions-gold-scene" data-phase={phase}
      className="quiz-gold-scene relative aspect-video w-full overflow-hidden rounded-2xl border border-[#b99a58]/45 bg-[#091827] font-sora text-[#f6f7f9] shadow-[0_20px_65px_rgba(0,0,0,0.35)]">
      <StadiumBackdrop x={motion.spotlightX} opacity={motion.spotlightOpacity} />
      <div className="absolute inset-0 flex flex-col p-[4%]">
        <header className="relative z-10 flex items-center justify-between border-b border-[#dab16b]/25 pb-[1.3%]">
          <span className="flex items-center gap-[0.55em] text-[clamp(10px,1.8vw,24px)] font-black tracking-[0.12em] text-[#f0c77b]">
            <Trophy className="h-[1.15em] w-[1.15em]"/> FOOTBALL LEGENDS
          </span>
          <span className="rounded-full border border-[#deb872]/35 bg-[#0b1828]/75 px-[1.3em] py-[0.55em] text-[clamp(8px,1.15vw,16px)] font-semibold tracking-wider text-[#d0dce6]">
            {showQuestion ? `ROUND ${String(questionIndex + 1).padStart(2, "0")} / ${questionCount}` : "CHAMPIONS GOLD"}
          </span>
        </header>

        {!showQuestion ? (
          <div style={{ opacity: motion.titleOpacity, transform: `scale(${motion.titleScale})` }} className="relative z-10 flex flex-1 flex-col items-center justify-center gap-[3%] text-center">
            <div className="flex h-[18%] items-center justify-center rounded-full border border-[#e6bd6f]/50 bg-[#e2b55f]/10 p-[2%] text-[#e9bd6c]">
              <Trophy className="h-full w-full"/>
            </div>
            <p className="text-[clamp(9px,1.35vw,20px)] font-extrabold tracking-[0.4em] text-[#e7be75]">
              {phase === "intro" ? "THE ULTIMATE CHALLENGE" : phase === "halftime" ? "HALF-TIME" : "FINAL WHISTLE"}
            </p>
            <h1 className="max-w-[85%] text-[clamp(22px,5vw,82px)] font-black uppercase leading-tight tracking-tight">
              {phase === "intro" ? title : phase === "halftime" ? "HOW MANY DID YOU GET?" : "YOU ARE A FOOTBALL LEGEND"}
            </h1>
            <p className="max-w-[75%] text-[clamp(10px,1.5vw,23px)] text-[#b9cdd9]">
              {phase === "intro" ? `${questionCount} questions. 10-second challenge. Play along!`
                : phase === "halftime" ? "Count your correct answers. The next half gets harder."
                : `Comment your score out of ${questionCount} and challenge a friend.`}
            </p>
          </div>
        ) : (
          <>
            <div style={{ opacity: motion.questionOpacity, transform: `translateY(${motion.questionOffsetY}px)` }} className="relative z-10 flex min-h-0 flex-1 items-center gap-[4%] py-[3%]">
              <div className="flex h-full w-[36%] shrink-0 flex-col items-center justify-center gap-[5%]">
                <div className="w-full" style={{ filter: `drop-shadow(0 0 ${Math.round(motion.suspensePulse * 26 + motion.revealOpacity * 20)}px rgba(235,185,93,.52))` }}><PlayerSilhouette revealed={revealed}/></div>
                <div className="flex w-full flex-wrap justify-center gap-1.5">
                  {question?.clues.slice(0, shownClues).map((clue, i) => (
                    <span key={i} style={{ opacity: motion.clueOpacity }} className="rounded-md border border-[#bf9c5d]/40 bg-[#172a3c]/85 px-[0.65em] py-[0.4em] text-[clamp(8px,1.2vw,18px)] font-semibold text-[#f1cd8b]">{clue}</span>
                  ))}
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3%]">
                <p className="text-[clamp(8px,1.1vw,15px)] font-bold uppercase tracking-[0.22em] text-[#ecc87d]">
                  {question?.type.replace("_", " ") || "Guess the player"} • {question?.difficulty || "easy"}
                </p>
                <h2 className="text-[clamp(15px,3.05vw,46px)] font-extrabold leading-[1.14] tracking-tight drop-shadow-md">
                  {question?.question || "Who is this football legend?"}
                </h2>
                <div className="grid grid-cols-2 gap-[2%] pt-[2%]">
                  {options.map((option, i) => {
                    const key = ["A", "B", "C", "D"][i];
                    const correct = question?.correctOption === key;
                    return (
                      <div key={key} style={{ opacity: revealed && !correct ? 1 - .62 * motion.revealOpacity : motion.optionOpacity, transform: `translateY(${motion.optionOffsetY}px)`, boxShadow: revealed && correct ? `0 0 ${Math.round(motion.revealOpacity * 28)}px rgba(80,225,144,.35)` : undefined }}
                        className={`flex min-h-[clamp(34px,5vw,78px)] items-center gap-[4%] rounded-lg border p-[4%] ${revealed && correct
                          ? "border-[#66dd9d] bg-[#176744]"
                          : revealed ? "border-[#344859] bg-[#122437]/65"
                          : showOptions ? "border-[#c6a15f]/65 bg-[#1a3348]" : "border-[#56677a]/60 bg-[#1a2e42]/65"`}
                      >
                        <span className={`flex h-[clamp(22px,2.5vw,40px)] w-[clamp(22px,2.5vw,40px)] shrink-0 items-center justify-center rounded-md text-[clamp(10px,1.4vw,23px)] font-black ${revealed && correct ? "bg-[#d1ffe0] text-[#0d5537]" : "bg-[#dcb36e] text-[#122538]"}`}>{key}</span>
                        <span className="min-w-0 break-words text-[clamp(9px,1.5vw,22px)] font-semibold leading-tight">{option}</span>
                        {revealed && correct && <Check className="ml-auto h-[1.5em] w-[1.5em] text-[#d5ffe2]"/>}
                      </div>
                    );
                  })}
                </div>
                {revealed && (
                  <div role="status" style={{ opacity: motion.revealOpacity, transform: `scale(${motion.revealScale})` }} className="mt-[2%] rounded-lg border border-[#d8b16c]/50 bg-[#e9bd70]/10 px-[4%] py-[2%] text-[clamp(9px,1.2vw,17px)] text-[#f2dcae]">
                    <span className="font-black text-[#ffe1a5]">ANSWER REVEALED</span> — {question?.explanation}
                  </div>
                )}
              </div>
            </div>

            <footer className="relative z-10 flex items-center gap-[2%] border-t border-[#d1b275]/20 pt-[2%]">
              <svg viewBox="0 0 100 100" role="img" aria-label={phase === "countdown" ? `Countdown: ${remainingSeconds} seconds` : "Timer"} className="h-[clamp(26px,5vw,74px)] w-[clamp(26px,5vw,74px)] shrink-0">
                <circle cx="50" cy="50" r="44" fill="#13283b" stroke="#4a6474" strokeWidth="7"/>
                <circle cx="50" cy="50" r="44" fill="none" stroke={motion.timerUrgent ? "#e26958" : "#edc77c"} strokeWidth="7" strokeLinecap="round" transform="rotate(-90 50 50)" strokeDasharray={ringDashArray(countdownProgress)}/>
                <text x="50" y="59" textAnchor="middle" fontSize="25" fontWeight="800" fill="#f9dfa1">{phase === "countdown" ? remainingSeconds : "•"}</text>
              </svg>
              <div className="h-[clamp(4px,.8vw,11px)] flex-1 overflow-hidden rounded-full bg-[#3f5263]">
                <div className={`h-full rounded-full ${motion.timerUrgent ? "bg-[#e26958]" : "bg-[#e9bf72]"}`} style={{ width: `${Math.round(countdownProgress * 100)}%` }}/>
              </div>
              <span className="w-[9%] text-right text-[clamp(11px,2.5vw,36px)] font-black tabular-nums text-[#edc77c]">
                {phase === "countdown" ? String(remainingSeconds).padStart(2,"0") : phase === "suspense" ? "!" : revealed ? <Sparkles className="inline-block h-[1em] w-[1em]"/> : "—"}
              </span>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
