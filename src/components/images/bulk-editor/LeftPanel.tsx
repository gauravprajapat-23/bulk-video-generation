import { type MutableRefObject } from "react";
import { ChevronLeft } from "lucide-react";
import { type EditorPanel } from "./types";
import { DesignPanel } from "./DesignPanel";
import { ElementsPanel } from "./ElementsPanel";
import { CsvPanel } from "./CsvPanel";
import { TextPanel } from "./TextPanel";
import { LayersPanel } from "./LayersPanel";
import { BrandPanel } from "./BrandPanel";
import { VersionsPanel } from "./VersionsPanel";
import { ImageLibrary } from "@/components/editor/ImageLibrary";
import { PanelHeader } from "./PanelHeader";
import { IMAGE_DESIGN_PRESETS } from "@/lib/bulkImageTypes";
import type { BulkImageDesign, DesignElement, DesignPage, ImageDesignPreset, CustomField, CanvasBackground, ShapeType } from "@/lib/bulkImageTypes";
import type { ImageAsset } from "@/lib/types";
import type { TemplateDefinition } from "@/lib/prebuiltTemplates";
import type { DesignVersion } from "@/lib/versionHistory";

interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

interface LeftPanelProps {
  activePanel: EditorPanel;
  design: BulkImageDesign;
  activePage: DesignPage;
  selectedIds: string[];
  images: ImageAsset[];
  imageUrlByKey: Record<string, string>;
  csvText: string;
  csvInputRef: MutableRefObject<HTMLInputElement | null>;
  parsedCsv: ParsedCsv;
  onClosePanel: () => void;
  updateDesign: (updates: Partial<BulkImageDesign>) => void;
  updateDesignAndRecord: (updates: Partial<BulkImageDesign>) => void;
  updateCanvasBg: (bg: CanvasBackground) => void;
  updateActivePage: (patch: Partial<DesignPage>) => void;
  updatePage: (id: string, patch: Partial<DesignPage>) => void;
  pushUndo: () => void;
  onOpenTemplates: () => void;
  onLoadTemplate: (template: TemplateDefinition) => void;
  addTextElement: (text: string, fontSize: number, fontWeight: number, align: "center" | "left" | "right") => void;
  addShapeElement: (type: ShapeType) => void;
  addLineElement: (style?: "solid" | "gradient" | "dashed" | "double" | "divider") => void;
  addBorderElement: () => void;
  addImageElement: () => void;
  addEmojiElement: (emoji: string) => void;
  setCsvText: (text: string) => void;
  handleCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  downloadSampleCsv: () => void;
  insertPlaceholder: (ph: string) => void;
  selectElement: (id: string | null) => void;
  onUpdateDesign: (updates: Partial<BulkImageDesign>) => void;
  updateElementAndRecord: (id: string, patch: Partial<DesignElement>) => void;
  versions: DesignVersion[];
  isAutoSaving: boolean;
  onRestoreVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onSaveVersion: (name: string) => void;
  reorderLayer: (fromId: string, toId: string) => void;
}

export function LeftPanel({
  activePanel,
  design,
  activePage,
  selectedIds,
  images,
  imageUrlByKey,
  csvText,
  csvInputRef,
  parsedCsv,
  onClosePanel,
  updateDesign,
  updateDesignAndRecord,
  updateCanvasBg,
  updateActivePage,
  pushUndo,
  onOpenTemplates,
  onLoadTemplate,
  addTextElement,
  addShapeElement,
  addLineElement,
  addBorderElement,
  addImageElement,
  addEmojiElement,
  setCsvText,
  handleCsvUpload,
  downloadSampleCsv,
  insertPlaceholder,
  selectElement,
  onUpdateDesign,
  versions,
  isAutoSaving,
  onRestoreVersion,
  onDeleteVersion,
  onSaveVersion,
  reorderLayer,
  updateElementAndRecord,
}: LeftPanelProps) {
  if (!activePanel) return null;

  return (
    <div className="absolute inset-y-0 left-[68px] z-30 flex w-[min(360px,calc(100vw-5rem))] flex-col overflow-visible border-r border-border/80 bg-panel/95 shadow-panel backdrop-blur-xl xl:relative xl:left-0 xl:z-auto xl:w-[360px] xl:shadow-none">
      <PanelHeader
        title={panelTitle(activePanel)}
        onClose={onClosePanel}
      />
      {/* Collapse tab on the panel's right edge (Canva-style) */}
      <button
        type="button"
        onClick={onClosePanel}
        title="Collapse panel"
        className="absolute -right-[18px] top-1/2 z-30 hidden h-16 w-[18px] -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-border/80 bg-panel text-muted transition hover:text-text xl:flex"
      >
        <ChevronLeft size={13} />
      </button>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
        {activePanel === "design" && (
          <DesignPanel
            design={design}
            updateDesign={updateDesignAndRecord}
            applyPreset={(preset) => {
              const dims = IMAGE_DESIGN_PRESETS[preset];
              updateDesignAndRecord({
                preset,
                width: preset === "custom" ? design.width : dims.width,
                height: preset === "custom" ? design.height : dims.height,
              });
            }}
            canvasBg={activePage.canvasBg}
            updateCanvasBg={updateCanvasBg}
            activePage={activePage}
            updateActivePage={updateActivePage}
            onOpenTemplates={onOpenTemplates}
            onLoadTemplate={onLoadTemplate}
          />
        )}
        {activePanel === "elements" && (
          <ElementsPanel
            onAddRect={() => addShapeElement("rect")}
            onAddCircle={() => addShapeElement("ellipse")}
            onAddTriangle={() => addShapeElement("triangle")}
            onAddStar={() => addShapeElement("star")}
            onAddArrow={() => addShapeElement("arrow")}
            onAddDiamond={() => addShapeElement("diamond")}
            onAddImage={addImageElement}
            onAddLine={() => addLineElement("solid")}
            onAddBorder={addBorderElement}
            onAddDashedLine={() => addLineElement("dashed")}
            onAddGradientLine={() => addLineElement("gradient")}
            onAddDoubleLine={() => addLineElement("double")}
            onAddDivider={() => addLineElement("divider")}
            onAddEmoji={addEmojiElement}
          />
        )}
        {activePanel === "text" && (
          <TextPanel
            onAddHeading={() => addTextElement("{{headline}}", 88, 900, "left")}
            onAddSubheading={() => addTextElement("{{subheadline}}", 44, 700, "left")}
            onAddBody={() => addTextElement("Add supporting text here", 32, 500, "left")}
            onAddTitle={() => addTextElement("{{title}}", 56, 800, "center")}
            onAddCaption={() => addTextElement("Caption or footnote text", 22, 400, "left")}
            onAddQuote={() => addTextElement("\"Add a quote here\"", 36, 500, "left")}
            onAddCta={() => addTextElement("SHOP NOW", 28, 900, "center")}
            onAddNumber={() => addTextElement("#1", 96, 900, "center")}
            onAddPlaceholder={(ph) => addTextElement(ph, 48, 700, "center")}
          />
        )}
        {activePanel === "uploads" && (
          <ImageLibrary
            images={images}
            imageUrlByKey={imageUrlByKey}
            onAddImage={addImageElement}
          />
        )}
        {activePanel === "csv" && (
          <CsvPanel
            csvText={csvText}
            setCsvText={setCsvText}
            csvInputRef={csvInputRef}
            handleCsvUpload={handleCsvUpload}
            downloadSampleCsv={downloadSampleCsv}
            parsedCsv={parsedCsv}
            insertPlaceholder={insertPlaceholder}
            design={design}
            onUpdateDesign={onUpdateDesign}
          />
        )}
        {activePanel === "layers" && (
          <LayersPanel
            elements={activePage.elements}
            selectedIds={selectedIds}
            selectElement={selectElement}
            onReorderLayer={reorderLayer}
            onUpdateElement={updateElementAndRecord}
          />
        )}
        {activePanel === "brand" && <BrandPanel onClose={onClosePanel} />}
        {activePanel === "versions" && (
          <VersionsPanel
            versions={versions}
            isAutoSaving={isAutoSaving}
            onRestore={onRestoreVersion}
            onDelete={onDeleteVersion}
            onSaveVersion={onSaveVersion}
            onClose={onClosePanel}
          />
        )}
      </div>
    </div>
  );
}

function panelTitle(panel: EditorPanel): string {
  switch (panel) {
    case "design":
      return "Design";
    case "elements":
      return "Elements";
    case "text":
      return "Text";
    case "uploads":
      return "Uploads";
    case "csv":
      return "CSV Data";
    case "layers":
      return "Layers";
    case "brand":
      return "Brand";
    case "versions":
      return "Version History";
    default:
      return "";
  }
}
