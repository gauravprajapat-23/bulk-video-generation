import { InspectorPanel } from "./InspectorPanel";
import { PanelHeader } from "./PanelHeader";
import type { BulkImageDesign, DesignElement } from "@/lib/bulkImageTypes";
import type { ImageAsset } from "@/lib/types";

interface RightInspectorProps {
  selectedElement: DesignElement | null;
  inspectorOpen: boolean;
  csvHeaders: string[];
  images: ImageAsset[];
  imageUrlByKey: Record<string, string>;
  updateElementAndRecord: (id: string, patch: Partial<DesignElement>) => void;
  pushUndo: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  insertPlaceholder: (ph: string) => void;
  openImagePickerForElement: (elementId: string) => void;
  lockToggle: () => void;
  setCropImageUrl: (url: string) => void;
  setCropOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
}

export function RightInspector({
  selectedElement,
  inspectorOpen,
  csvHeaders,
  images,
  imageUrlByKey,
  updateElementAndRecord,
  pushUndo,
  duplicateSelected,
  deleteSelected,
  bringToFront,
  sendToBack,
  insertPlaceholder,
  openImagePickerForElement,
  lockToggle,
  setCropImageUrl,
  setCropOpen,
  setInspectorOpen,
}: RightInspectorProps) {
  if (!selectedElement || !inspectorOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-[min(370px,calc(100vw-4rem))] flex-col overflow-hidden border-l border-border/80 bg-panel/95 shadow-panel backdrop-blur-xl">
      <PanelHeader
        title="Properties"
        onClose={() => setInspectorOpen(false)}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <InspectorPanel
          selectedElement={selectedElement}
          headers={csvHeaders}
          images={images}
          updateElement={(patch) =>
            updateElementAndRecord(selectedElement.id, patch)
          }
          duplicateElement={() => {
            pushUndo();
            duplicateSelected();
          }}
          deleteSelectedElement={() => {
            pushUndo();
            deleteSelected();
          }}
          moveSelectedLayer={(dir) =>
            dir === "front" ? bringToFront() : sendToBack()
          }
          insertPlaceholder={insertPlaceholder}
          onUploadIntoPlaceholder={openImagePickerForElement}
          lockToggle={lockToggle}
          onCropImage={(imageAssetId) => {
            const asset = images.find((img) => img.id === imageAssetId);
            if (asset) {
              setCropImageUrl(imageUrlByKey[asset.blobKey] || "");
              setCropOpen(true);
            }
          }}
        />
      </div>
    </div>
  );
}
