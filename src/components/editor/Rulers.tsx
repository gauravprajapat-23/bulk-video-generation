"use client";

interface RulersProps {
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  zoom: number;
}

export function Rulers({ canvasWidth, canvasHeight, scale, zoom }: RulersProps) {
  const stageScale = scale * zoom;
  const widthPx = canvasWidth * stageScale;
  const heightPx = canvasHeight * stageScale;

  function getTickMarks(totalUnits: number, pixelsPerUnit: number) {
    const ticks: Array<{ pos: number; label: string; major: boolean }> = [];
    for (let i = 0; i <= totalUnits; i += 10) {
      const pos = i * pixelsPerUnit;
      if (pos <= (totalUnits > 1000 ? widthPx : heightPx) + 100) {
        ticks.push({ pos, label: String(i), major: true });
      }
    }
    return ticks;
  }

  const hTicks = getTickMarks(canvasWidth, stageScale);
  const vTicks = getTickMarks(canvasHeight, stageScale);

  return (
    <>
      {/* Horizontal ruler */}
      <div className="absolute left-[40px] top-0 z-30 h-[28px] overflow-hidden border-b border-r border-border/50 bg-[#0D1017]" style={{ width: widthPx }}>
        <div className="relative h-full">
          {hTicks.map((tick) => (
            <div
              key={tick.label}
              className="absolute top-0 flex h-full flex-col items-center"
              style={{ left: tick.pos }}
            >
              <span className="text-[8px] text-muted/60 select-none">{tick.label}</span>
              <div className="h-1.5 w-px bg-muted/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Vertical ruler */}
      <div className="absolute left-0 top-[28px] z-30 w-[40px] overflow-hidden border-b border-r border-border/50 bg-[#0D1017]" style={{ height: heightPx }}>
        <div className="relative h-full w-full">
          {vTicks.map((tick) => (
            <div
              key={tick.label}
              className="absolute left-0 flex w-full flex-row items-center"
              style={{ top: tick.pos }}
            >
              <span className="text-[8px] text-muted/60 select-none" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>{tick.label}</span>
              <div className="h-px w-1.5 bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
