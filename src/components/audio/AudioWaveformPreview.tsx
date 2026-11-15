"use client";

export function AudioWaveformPreview({
  waveform,
  trimStartMs,
  trimEndMs,
  totalDurationMs,
  height = 40,
}: {
  waveform: number[];
  trimStartMs?: number;
  trimEndMs?: number | null;
  totalDurationMs: number;
  height?: number;
}) {
  const startPct = trimStartMs !== undefined ? (trimStartMs / totalDurationMs) * 100 : 0;
  const endPct = trimEndMs ? (trimEndMs / totalDurationMs) * 100 : 100;

  return (
    <div className="relative w-full" style={{ height }}>
      <div className="flex h-full w-full items-center gap-[1.5px]">
        {waveform.map((v, i) => {
          const pct = (i / waveform.length) * 100;
          const inTrim = pct >= startPct && pct <= endPct;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max(6, v * 100)}%`,
                backgroundColor: inTrim ? "#7C5CFC" : "#262B34",
              }}
            />
          );
        })}
      </div>
      {(trimStartMs !== undefined || trimEndMs) && (
        <>
          <div className="absolute top-0 bottom-0 bg-bg/70" style={{ left: 0, width: `${startPct}%` }} />
          <div className="absolute top-0 bottom-0 bg-bg/70" style={{ left: `${endPct}%`, right: 0 }} />
        </>
      )}
    </div>
  );
}
