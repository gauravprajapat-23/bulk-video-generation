import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import type { BulkImageDesign } from "@/lib/bulkImageTypes";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  design: BulkImageDesign;
  exportScale: number;
  exportQuality: number;
  exportTransparent: boolean;
  onScaleChange: (scale: number) => void;
  onQualityChange: (quality: number) => void;
  onTransparentChange: (transparent: boolean) => void;
  onExportPng: () => void;
  onExportJpeg: () => void;
  onExportPdf: () => void;
  onExportSvg: () => void;
}

export function ExportDialog({
  open,
  onClose,
  design,
  exportScale,
  exportQuality,
  exportTransparent,
  onScaleChange,
  onQualityChange,
  onTransparentChange,
  onExportPng,
  onExportJpeg,
  onExportPdf,
  onExportSvg,
}: ExportDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Design"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted">
          Choose an export format for the current page&apos;s preview.
        </p>

        <div>
          <Label>Resolution Scale</Label>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onScaleChange(s)}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  exportScale === s
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-panel2 text-muted hover:text-text"
                }`}
              >
                {s}x ({design.width * s} x {design.height * s})
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>JPEG Quality ({exportQuality}%)</Label>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={exportQuality}
            onChange={(e) => onQualityChange(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>Smaller file</span>
            <span>Higher quality</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportTransparent}
              onChange={(e) => onTransparentChange(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-xs text-muted">Transparent background (PNG only)</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onExportPng}
            className="rounded-2xl border border-border bg-panel2 p-6 text-center transition hover:border-accent hover:bg-accent/10"
          >
            <div className="mb-2 text-2xl">PNG</div>
            <p className="text-xs text-muted">
              Lossless quality, larger file size
            </p>
          </button>
          <button
            type="button"
            onClick={onExportJpeg}
            className="rounded-2xl border border-border bg-panel2 p-6 text-center transition hover:border-accent hover:bg-accent/10"
          >
            <div className="mb-2 text-2xl">JPEG</div>
            <p className="text-xs text-muted">
              Smaller file size, slight quality loss
            </p>
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            className="rounded-2xl border border-border bg-panel2 p-6 text-center transition hover:border-accent hover:bg-accent/10"
          >
            <div className="mb-2 text-2xl">PDF</div>
            <p className="text-xs text-muted">
              Multi-page document, print-ready
            </p>
          </button>
          <button
            type="button"
            onClick={onExportSvg}
            className="rounded-2xl border border-border bg-panel2 p-6 text-center transition hover:border-accent hover:bg-accent/10"
          >
            <div className="mb-2 text-2xl">SVG</div>
            <p className="text-xs text-muted">
              Vector format, scalable infinitely
            </p>
          </button>
        </div>
      </div>
    </Modal>
  );
}
