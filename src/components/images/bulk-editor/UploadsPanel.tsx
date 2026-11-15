import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ImageAsset } from "@/lib/types";

export function UploadsPanel({
  images,
  imageUrlByKey,
  onAddImage,
}: {
  images: ImageAsset[];
  imageUrlByKey: Record<string, string>;
  onAddImage: (imageAssetId?: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-panel2 p-4">
        <UploadCloud className="mb-2 text-accent" size={22} />
        <p className="text-sm font-bold text-text">
          Use images from your library
        </p>
        <p className="mt-1 text-xs text-muted">
          Upload images from the Create/Bulk flow, then place them inside frames
          here.
        </p>
        <Button
          className="mt-3"
          variant="secondary"
          size="sm"
          onClick={() => onAddImage()}
        >
          Add image frame
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {images.slice(0, 8).map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => onAddImage(image.id)}
            className="overflow-hidden rounded-2xl border border-border bg-panel2 text-left hover:border-accent"
          >
            {imageUrlByKey[image.blobKey] ? (
              <img
                src={imageUrlByKey[image.blobKey]}
                alt={image.name}
                className="h-24 w-full object-cover"
              />
            ) : (
              <div className="h-24 bg-bg" />
            )}
            <p className="truncate px-2 py-2 text-[11px] text-muted">
              {image.name}
            </p>
          </button>
        ))}
      </div>
      {!images.length && (
        <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted">
          No uploaded images yet.
        </p>
      )}
    </div>
  );
}
