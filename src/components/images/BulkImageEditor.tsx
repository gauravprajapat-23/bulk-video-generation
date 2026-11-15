"use client";

import React from "react";
import {
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { newId, nowIso } from "@/lib/id";
import { createCsv, parseCsv } from "@/lib/csv";
import {
  BulkImageDesign,
  DesignElement,
  DesignPage,
  ImageDesignElement,
  ShapeDesignElement,
  TextDesignElement,
  DEFAULT_FONT,
} from "@/lib/bulkImageTypes";
import type { ImageAsset, AnimationPreset, AudioAssignment } from "@/lib/types";
import { DEFAULT_ANIMATION_PRESET } from "@/lib/types";
import { applyCustomFieldMappings } from "@/lib/placeholders";
import { createProjectsFromCsv } from "@/services/bulkVideoPipeline";
import { runProjectRender } from "@/services/renderRunner";
import { useRouter } from "next/navigation";
import { type TemplateDefinition } from "@/lib/prebuiltTemplates";
import { loadDefaultFonts } from "@/lib/fonts";
import { ensureKeyframesInjected } from "@/lib/animationPreview";
import { ContextMenu } from "@/components/editor/ContextMenu";
import { AnimationTimeline } from "./bulk-editor/AnimationTimeline";
import { CanvasWorkspace } from "./bulk-editor/CanvasWorkspace";
import { LeftPanel } from "./bulk-editor/LeftPanel";
import { RightInspector } from "./bulk-editor/RightInspector";
import { useBulkImageGeneration } from "./bulk-editor/useBulkImageGeneration";
import { DesignCanvasElement } from "./bulk-editor/DesignCanvasElement";
import { useEditorKeyboardShortcuts } from "./bulk-editor/useEditorKeyboardShortcuts";
import { EditorTopBar } from "./bulk-editor/EditorTopBar";
import { ToolRail } from "./bulk-editor/ToolRail";
import { VideoAnimationSettings } from "./bulk-editor/VideoAnimationSettings";
import { PresentationMode } from "./bulk-editor/PresentationMode";
import { ShareModal } from "./bulk-editor/ShareModal";
import { ImageCropModal } from "@/components/editor/ImageCropModal";
import type { MarqueeState, ResizeHandlePosition } from "./bulk-editor/types";
import { useVersionHistory } from "@/lib/versionHistory";
import { useCanvasDrag, useCanvasDragListeners } from "./bulk-editor/useCanvasDrag";
import { useEditorActions } from "./bulk-editor/useEditorActions";
import { useImageFileHandling, useCsvHandling } from "./bulk-editor/useFileHandling";
import { VideoGenerationModal } from "./bulk-editor/VideoGenerationModal";

const BulkPreviewModal = React.lazy(() => import("./bulk-editor/BulkPreviewModal").then((m) => ({ default: m.BulkPreviewModal })));
const ExportDialog = React.lazy(() => import("./bulk-editor/ExportDialog").then((m) => ({ default: m.ExportDialog })));
const SaveDialog = React.lazy(() => import("./bulk-editor/SaveDialog").then((m) => ({ default: m.SaveDialog })));
const LoadDialog = React.lazy(() => import("./bulk-editor/LoadDialog").then((m) => ({ default: m.LoadDialog })));

const sampleHeaders = ["headline", "subheadline", "days_left", "cta", "date"];
const sampleRows = [
  {
    headline: "Stop Waiting. Start Today.",
    subheadline: "Small discipline creates big results.",
    days_left: "167 DAYS LEFT",
    cta: "Build before 2027",
    date: "26 June 2026",
  },
  {
    headline: "Your Future Self Is Watching",
    subheadline: "One focused hour can change your whole week.",
    days_left: "166 DAYS LEFT",
    cta: "No excuses today",
    date: "27 June 2026",
  },
];

const starterCsv = createCsv(sampleHeaders, sampleRows);

export type EditorPanel = import("./bulk-editor/types").EditorPanel;

interface SavedDesign extends BulkImageDesign {}

function createStarterDesign(): BulkImageDesign {
  const ts = nowIso();
  const elements: DesignElement[] = [
    {
      id: newId(),
      type: "ellipse",
      name: "Glow circle",
      x: -180,
      y: -120,
      width: 520,
      height: 520,
      rotation: 0,
      opacity: 0.35,
      zIndex: 0,
      fill: "#7C5CFC",
      stroke: "#7C5CFC",
      strokeWidth: 0,
      borderRadius: 999,
    },
    {
      id: newId(),
      type: "rect",
      name: "Top badge",
      x: 92,
      y: 150,
      width: 470,
      height: 88,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      fill: "#FFB454",
      stroke: "#FFB454",
      strokeWidth: 0,
      borderRadius: 42,
    },
    {
      id: newId(),
      type: "text",
      name: "Days left",
      x: 125,
      y: 162,
      width: 410,
      height: 64,
      rotation: 0,
      opacity: 1,
      zIndex: 2,
      text: "{{days_left}}",
      fontSize: 36,
      fontWeight: 900,
      color: "#101827",
      align: "center",
      lineHeight: 1.1,
      backgroundColor: "transparent",
      borderRadius: 0,
      fontFamily: DEFAULT_FONT,
      letterSpacing: 0,
    },
    {
      id: newId(),
      type: "text",
      name: "Headline",
      x: 92,
      y: 570,
      width: 896,
      height: 430,
      rotation: 0,
      opacity: 1,
      zIndex: 3,
      text: "{{headline}}",
      fontSize: 96,
      fontWeight: 900,
      color: "#FFFFFF",
      align: "left",
      lineHeight: 1.02,
      backgroundColor: "transparent",
      borderRadius: 0,
      fontFamily: DEFAULT_FONT,
      letterSpacing: 0,
    },
    {
      id: newId(),
      type: "text",
      name: "Subheadline",
      x: 96,
      y: 1035,
      width: 820,
      height: 160,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      text: "{{subheadline}}",
      fontSize: 42,
      fontWeight: 650,
      color: "#DDE7F0",
      align: "left",
      lineHeight: 1.22,
      backgroundColor: "transparent",
      borderRadius: 0,
      fontFamily: DEFAULT_FONT,
      letterSpacing: 0,
    },
    {
      id: newId(),
      type: "rect",
      name: "Bottom card",
      x: 84,
      y: 1470,
      width: 912,
      height: 240,
      rotation: 0,
      opacity: 1,
      zIndex: 5,
      fill: "#FFFFFF",
      stroke: "#FFFFFF",
      strokeWidth: 0,
      borderRadius: 48,
    },
    {
      id: newId(),
      type: "text",
      name: "CTA",
      x: 128,
      y: 1516,
      width: 820,
      height: 76,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      text: "{{cta}}",
      fontSize: 48,
      fontWeight: 900,
      color: "#101827",
      align: "left",
      lineHeight: 1.1,
      backgroundColor: "transparent",
      borderRadius: 0,
      fontFamily: DEFAULT_FONT,
      letterSpacing: 0,
    },
    {
      id: newId(),
      type: "text",
      name: "Date",
      x: 128,
      y: 1602,
      width: 820,
      height: 54,
      rotation: 0,
      opacity: 1,
      zIndex: 7,
      text: "{{date}}",
      fontSize: 30,
      fontWeight: 700,
      color: "#697486",
      align: "left",
      lineHeight: 1.1,
      backgroundColor: "transparent",
      borderRadius: 0,
      fontFamily: DEFAULT_FONT,
      letterSpacing: 0,
    },
  ];

  return {
    id: `design-${crypto.randomUUID().slice(0, 8)}`,
    name: "Untitled Design",
    preset: "custom",
    width: 1080,
    height: 1920,
    updatedAt: ts,
    customFields: [],
    pages: [
      {
        id: newId(),
        name: "Page 1",
        backgroundColor: "#0F172A",
        canvasBg: { type: "solid", color: "#0F172A" },
        transitionIn: "fade",
        elements,
        durationMs: 3000,
      },
    ],
  };
}


export function BulkImageEditor() {
  const { show } = useToast();
  const images = useAppStore((s) => s.images);
  const addImageAssets = useAppStore((s) => s.addImageAssets);

  const design = useEditorStore((s) => s.design);
  const activePageId = useEditorStore((s) => s.activePageId);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const editingElementId = useEditorStore((s) => s.editingElementId);
  const clipboard = useEditorStore((s) => s.clipboard);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);
  const guides = useEditorStore((s) => s.guides);
  const zoom = useEditorStore((s) => s.zoom);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const gridEnabled = useEditorStore((s) => s.gridEnabled);

  const setDesign = useEditorStore((s) => s.setDesign);
  const updateDesign = useEditorStore((s) => s.updateDesign);
  const addPage = useEditorStore((s) => s.addPage);
  const duplicatePage = useEditorStore((s) => s.duplicatePage);
  const deletePage = useEditorStore((s) => s.deletePage);
  const reorderPages = useEditorStore((s) => s.reorderPages);
  const setActivePage = useEditorStore((s) => s.setActivePage);
  const updatePage = useEditorStore((s) => s.updatePage);
  const selectElement = useEditorStore((s) => s.selectElement);
  const toggleSelect = useEditorStore((s) => s.toggleSelect);
  const selectAll = useEditorStore((s) => s.selectAll);
  const selectAllOfType = useEditorStore((s) => s.selectAllOfType);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setEditingElement = useEditorStore((s) => s.setEditingElement);
  const addElement = useEditorStore((s) => s.addElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateElements = useEditorStore((s) => s.updateElements);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);
  const lockToggle = useEditorStore((s) => s.lockToggle);
  const groupSelected = useEditorStore((s) => s.groupSelected);
  const ungroupSelected = useEditorStore((s) => s.ungroupSelected);
  const reorderLayer = useEditorStore((s) => s.reorderLayer);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const copy = useEditorStore((s) => s.copy);
  const cut = useEditorStore((s) => s.cut);
  const paste = useEditorStore((s) => s.paste);
  const pasteInPlace = useEditorStore((s) => s.pasteInPlace);
  const pasteWithoutFormatting = useEditorStore((s) => s.pasteWithoutFormatting);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setGuides = useEditorStore((s) => s.setGuides);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled);
  const setGridEnabled = useEditorStore((s) => s.setGridEnabled);
  const panOffset = useEditorStore((s) => s.panOffset);
  const setPanOffset = useEditorStore((s) => s.setPanOffset);
  const saveDesign = useEditorStore((s) => s.saveDesign);
  const loadDesign = useEditorStore((s) => s.loadDesign);
  const savedDesigns = useEditorStore((s) => s.savedDesigns);
  const loadSavedDesigns = useEditorStore((s) => s.loadSavedDesigns);
  const deleteSavedDesign = useEditorStore((s) => s.deleteSavedDesign);

  const router = useRouter();
  const createProject = useAppStore((s) => s.createProject);
  const addImagesToProject = useAppStore((s) => s.addImagesToProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const createRenderJob = useAppStore((s) => s.createRenderJob);
  const updateRenderJob = useAppStore((s) => s.updateRenderJob);
  const assignAudioToProject = useAppStore((s) => s.assignAudioToProject);
  const audio = useAppStore((s) => s.audio);

  const [activePanel, setActivePanel] = useState<EditorPanel>("design");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [csvText, setCsvText] = useState(starterCsv);
  const [workspaceSize, setWorkspaceSize] = useState({
    width: 620,
    height: 700,
  });
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [loadDialogTab, setLoadDialogTab] = useState<"designs" | "templates">("designs");
  const [rulersEnabled, setRulersEnabled] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState("");
  const [previewAnimating, setPreviewAnimating] = useState(false);
  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);
  const [exportScale, setExportScale] = useState<number>(1);
  const [exportQuality, setExportQuality] = useState<number>(95);
  const [exportTransparent, setExportTransparent] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [animationTimelineOpen, setAnimationTimelineOpen] = useState(false);
  const [videoGenOpen, setVideoGenOpen] = useState(false);
  const [videoGenStatuses, setVideoGenStatuses] = useState<Record<string, { status: "pending" | "processing" | "completed" | "failed"; error?: string }>>({});
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoSettingsOpen, setVideoSettingsOpen] = useState(false);
  const [videoAnimPreset, setVideoAnimPreset] = useState<AnimationPreset>({ ...DEFAULT_ANIMATION_PRESET });
  const [videoAudio, setVideoAudio] = useState<AudioAssignment | null>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);

  const activePage: DesignPage = useMemo(
    () => design.pages.find((p) => p.id === activePageId) ?? design.pages[0],
    [design.pages, activePageId],
  );

  const parsedCsv = useMemo(() => parseCsv(csvText), [csvText]);
  const previewRow = useMemo(
    () => applyCustomFieldMappings(parsedCsv.rows[0] ?? {}, design.customFields),
    [parsedCsv.rows, design.customFields],
  );

  const {
    generating,
    progress,
    lastCreatedIds,
    bulkPreviewOpen,
    setBulkPreviewOpen,
    bulkPreviewLoading,
    bulkPreviewItems,
    zipDownloading,
    exportOpen,
    setExportOpen,
    downloadPreview,
    downloadPreviewAsZip,
    downloadGeneratedAsZip,
    exportAsJPEG,
    exportAsPdf,
    exportAsSvg,
    openBulkPreview,
    generateBulkImages,
  } = useBulkImageGeneration({
    design,
    activePage,
    previewRow,
    images,
    parsedCsv,
    exportScale,
    exportQuality,
    exportTransparent,
    addImageAssets,
    show,
  });

  const {
    versions,
    isAutoSaving,
    saveVersion,
    restoreVersion,
    deleteVersion,
    checkForRecovery,
    clearAutoSave,
  } = useVersionHistory({
    design,
    onLoadDesign: loadDesign,
  });

  const imageUrlByKey = useObjectUrls(images.map((img) => img.blobKey));
  const selectedElement =
    activePage.elements.find((el) => selectedIds.includes(el.id)) ?? null;

  const selectedElements = useMemo(
    () => activePage.elements.filter((el) => selectedIds.includes(el.id)),
    [activePage.elements, selectedIds],
  );

  const multiSelectBounds = useMemo(() => {
    if (selectedElements.length < 2) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of selectedElements) {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [selectedElements]);

  const baseScale = useMemo(() => {
    const horizontalPadding = 64;
    const verticalPadding = 86;
    const availableWidth = Math.max(
      260,
      workspaceSize.width - horizontalPadding,
    );
    const availableHeight = Math.max(
      260,
      workspaceSize.height - verticalPadding,
    );
    return Math.min(
      1,
      availableWidth / design.width,
      availableHeight / design.height,
    );
  }, [design.height, design.width, workspaceSize.height, workspaceSize.width]);

  const stageScale = useMemo(
    () => baseScale * zoom,
    [baseScale, zoom],
  );

  const sortedElements = useMemo(
    () => [...activePage.elements].sort((a, b) => a.zIndex - b.zIndex),
    [activePage.elements],
  );

  // Canvas drag hook
  const {
    dragRef,
    marqueeRef: dragMarqueeRef,
    handlePointerDown: rawHandlePointerDown,
    handleCanvasPointerDown,
  } = useCanvasDrag({
    stageScale,
    designWidth: design.width,
    designHeight: design.height,
    snapEnabled,
    activePageElements: activePage.elements,
  });

  // Attach global drag listeners
  const { handleMove: dragHandleMove, handleUp: dragHandleUp } = useCanvasDragListeners({
    dragRef,
    marqueeRef: dragMarqueeRef,
    stageScale,
    designWidth: design.width,
    designHeight: design.height,
    snapEnabled,
    activePageElements: activePage.elements,
  });

  // Editor actions hook
  const {
    updateDesignAndRecord,
    updateElementAndRecord,
    updateCanvasBg,
    handleAddPage,
    handleDuplicatePage,
    handleDeletePage,
    handleReorderPages,
    handleSelectPage,
    addTextElement: rawAddTextElement,
    addShapeElement,
    addLineElement,
    addBorderElement,
    addEmojiElement,
    addImageElement: rawAddImageElement,
    handleAlign,
    handleDistribute,
    handleMultiSelectResize,
    resetMultiSelectResizeUndoState,
  } = useEditorActions({
    design,
    activePage,
    selectedIds,
    multiSelectBounds,
    selectedElements,
  });

  // File handling hooks
  const { imageInputRef, handleImageFiles, openImagePickerForElement, handleImageInputChange } = useImageFileHandling();
  const { csvInputRef, handleCsvUpload, downloadSampleCsv } = useCsvHandling({
    onCsvTextChange: setCsvText,
    starterCsv,
  });

  useEffect(() => {
    loadDefaultFonts();
    loadSavedDesigns();
    ensureKeyframesInjected();
  }, []);

  useEffect(() => {
    const node = workspaceRef.current;
    if (!node) return;
    const updateSize = () => {
      setWorkspaceSize({ width: node.clientWidth, height: node.clientHeight });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    if (!editingElementId) return;
    window.requestAnimationFrame(() => {
      const editor = document.querySelector<HTMLElement>(
        `[data-editable-id="${editingElementId}"]`,
      );
      if (!editor) return;
      editor.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }, [editingElementId]);

  useEffect(() => {
    return () => {
      bulkPreviewItems.forEach((item) => item.pages.forEach((p) => URL.revokeObjectURL(p.url)));
    };
  }, [bulkPreviewItems]);

  useEffect(() => {
    if (
      selectedIds.length > 0 &&
      !activePage.elements.some((el) => selectedIds.includes(el.id))
    ) {
      clearSelection();
    }
  }, [activePage.elements, selectedIds, clearSelection]);

  // Keyboard shortcuts
  useEditorKeyboardShortcuts({
    editingElementId,
    selectedIds,
    activePage,
    undo,
    redo,
    copy,
    cut,
    paste,
    pasteInPlace,
    pasteWithoutFormatting,
    duplicateSelected,
    selectAll,
    deleteSelected,
    clearSelection,
    pushUndo,
    updateElement,
    groupSelected,
    ungroupSelected,
    zoom,
    setZoom,
  });

  // Drag/marquee useEffect
  useEffect(() => {
    window.addEventListener("pointermove", dragHandleMove);
    window.addEventListener("pointerup", dragHandleUp);
    return () => {
      window.removeEventListener("pointermove", dragHandleMove);
      window.removeEventListener("pointerup", dragHandleUp);
    };
  }, [dragHandleMove, dragHandleUp]);

  function addTextElement(
    text = "Double click to edit {{headline}}",
    fontSize = 56,
    fontWeight = 800,
    align: TextDesignElement["align"] = "center",
  ) {
    const id = rawAddTextElement(text, fontSize, fontWeight, align);
    setEditingElement(id);
  }

  function addImageElement(imageAssetId?: string | null) {
    rawAddImageElement(imageAssetId, images[0]);
  }

  function insertPlaceholder(header: string) {
    if (!selectedElement || selectedElement.type !== "text") return;
    updateElementAndRecord(selectedElement.id, {
      text: `${selectedElement.text}${selectedElement.text.endsWith(" ") ? "" : " "}{{${header}}}`,
    });
  }

  function togglePanel(panel: Exclude<EditorPanel, null>) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>,
    element: DesignElement,
    mode: "move" | "resize" = "move",
    resizeHandle: ResizeHandlePosition = "se",
  ) {
    rawHandlePointerDown(event, element, mode, resizeHandle);
    setMarquee(dragMarqueeRef.current);
  }

  function handleSaveDesign() {
    saveDesign();
    show("Design saved to browser storage.", "success");
  }

  function handleLoadDesign(designToLoad: SavedDesign) {
    loadDesign(designToLoad);
    setLoadDialogOpen(false);
    show("Design loaded.", "success");
  }

  function handleLoadTemplate(template: TemplateDefinition) {
    const designCopy = {
      ...template.design,
      id: `design-${crypto.randomUUID().slice(0, 8)}`,
      updatedAt: new Date().toISOString(),
    };
    loadDesign(designCopy as BulkImageDesign);

    if (template.sampleData && Object.keys(template.sampleData).length > 0) {
      const headers = Object.keys(template.sampleData);
      const row = template.sampleData;
      const csv = createCsv(headers, [row]);
      setCsvText(csv);
    }

    setLoadDialogOpen(false);
    show(
      `Template "${template.name}" loaded with sample data.`,
      "success",
    );
  }

  async function handleCreateVideos() {
    if (generating) return;

    const parsed =
      parsedCsv.rows.length > 0
        ? parsedCsv
        : { headers: [], rows: [previewRow] };

    if (parsed.rows.length === 0) {
      show("Add CSV data or content before creating videos.", "error");
      return;
    }

    let generatedImages: ImageAsset[];

    show("Generating images for video…", "info");
    const created = await generateBulkImages({ skipText: true });
    generatedImages = created;

    if (generatedImages.length === 0) {
      show("No images were generated. Please check your CSV data.", "error");
      return;
    }

    const createdProjects = createProjectsFromCsv(
      generatedImages,
      parsed,
      design,
      createProject,
      addImagesToProject,
      {
        defaultPageDurationMs: design.pages[0]?.durationMs || 5000,
        defaultTransitionDurationMs: design.pages[0]?.transitionDurationMs || 500,
        imagesPerVideo: design.pages.length,
        defaultAnimationPreset: videoAnimPreset,
      },
    );

    if (createdProjects.projects.length === 0) {
      if (createdProjects.errors.length > 0) {
        show(
          `${createdProjects.errors.length} row(s) failed. Check console for details.`,
          "error",
        );
      }
      return;
    }

    show(
      `${createdProjects.projects.length} video(s) created. Generating videos...`,
      "success",
    );

    const freshAudio = useAppStore.getState().audio;
    if (videoAudio) {
      for (const project of createdProjects.projects) {
        assignAudioToProject(project.id, videoAudio);
      }
    } else if (freshAudio.length > 0) {
      const defaultAudio = freshAudio[0];
      for (const project of createdProjects.projects) {
        assignAudioToProject(project.id, {
          audioAssetId: defaultAudio.id,
          trimStartMs: 0,
          trimEndMs: null,
          loopIfShorter: true,
          cutIfLonger: true,
          volume: 1,
        });
      }
    }

    setVideoGenOpen(true);
    setVideoGenerating(true);
    const initial: Record<string, { status: "pending" }> = {};
    createdProjects.projects.forEach((p) => (initial[p.id] = { status: "pending" }));
    setVideoGenStatuses(initial);

    let completedCount = 0;
    let failedCount = 0;

    for (const project of createdProjects.projects) {
      const freshProject = useAppStore.getState().projects.find((p) => p.id === project.id);
      if (!freshProject) continue;
      const freshAudio = useAppStore.getState().audio;

      setVideoGenStatuses((cur) => ({ ...cur, [freshProject.id]: { status: "processing" } }));
      const job = createRenderJob(freshProject.id);
      updateRenderJob(job.id, { status: "processing", startedAt: new Date().toISOString() });
      updateProject(freshProject.id, { status: "rendering" });

      try {
        const result = await runProjectRender({
          project: freshProject,
          allImages: useAppStore.getState().images,
          allAudio: freshAudio,
          onProgress: (pct) => updateRenderJob(job.id, { progressPercent: pct }),
        });
        updateProject(freshProject.id, {
          status: "completed",
          outputBlobKey: result.outputBlobKey,
          outputSizeBytes: result.outputSizeBytes,
          outputDurationMs: result.outputDurationMs,
          outputFormat: result.outputFormat,
        });
        updateRenderJob(job.id, { status: "completed", progressPercent: 100, finishedAt: new Date().toISOString() });
        setVideoGenStatuses((cur) => ({ ...cur, [freshProject.id]: { status: "completed" } }));
        completedCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Render failed.";
        updateProject(freshProject.id, { status: "failed" });
        updateRenderJob(job.id, { status: "failed", errorMessage: message, finishedAt: new Date().toISOString() });
        setVideoGenStatuses((cur) => ({ ...cur, [freshProject.id]: { status: "failed", error: message } }));
        failedCount++;
      }
    }

    setVideoGenerating(false);

    show(
      `Video generation complete! ${completedCount}/${createdProjects.projects.length} video(s) rendered.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`,
      "success",
    );

    if (completedCount > 0) {
      const completedIds = createdProjects.projects
        .filter((p) => useAppStore.getState().projects.find((pp) => pp.id === p.id)?.status === "completed")
        .map((p) => p.id);
      if (completedIds.length > 0) {
        router.push(`/scheduler?projects=${completedIds.join(",")}`);
      }
    }
  }

  async function handlePreviewAnimations() {
    if (previewAnimating || design.pages.length < 2) return;
    setPreviewAnimating(true);
    const savedPageId = activePage.id;

    for (let i = 0; i < design.pages.length; i++) {
      setPreviewPageIndex(i);
      setActivePage(design.pages[i].id);
      const slideDuration = design.pages[i].durationMs || 3000;
      const transitionDuration = design.pages[i].transitionDurationMs || 500;
      const totalWait = slideDuration + (i < design.pages.length - 1 ? transitionDuration : 0);
      await new Promise((r) => setTimeout(r, totalWait));
    }

    setPreviewPageIndex(null);
    setActivePage(savedPageId);
    setPreviewAnimating(false);
  }

  function renderElement(element: DesignElement) {
    return (
      <DesignCanvasElement
        key={element.id}
        element={element}
        stageScale={stageScale}
        selectedIds={selectedIds}
        editingElementId={editingElementId}
        previewAnimating={previewAnimating}
        previewPageIndex={previewPageIndex}
        images={images}
        imageUrlByKey={imageUrlByKey}
        previewRow={previewRow}
        handlePointerDown={handlePointerDown}
        selectElement={selectElement}
        setEditingElement={setEditingElement}
        setInspectorOpen={setInspectorOpen}
        updateElementAndRecord={updateElementAndRecord}
        updateElement={updateElement}
        pushUndo={pushUndo}
        openImagePickerForElement={openImagePickerForElement}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex h-dvh w-full flex-col overflow-hidden bg-[#080A0F] text-text">
      <EditorTopBar
        design={design}
        rowsCount={parsedCsv.rows.length || 1}
        generating={generating}
        selectedElement={selectedElement}
        activePanel={activePanel}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        undoDepth={undoStack.length}
        redoDepth={redoStack.length}
        onUndo={undo}
        onRedo={redo}
        onOpenBulkPreview={openBulkPreview}
        onGenerate={generateBulkImages}
        onOpenDesign={() => setActivePanel("design")}
        onToggleInspector={() => setInspectorOpen((open) => !open)}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        onExport={() => setExportOpen(true)}
        onSave={() => setSaveDialogOpen(true)}
        onLoad={() => setLoadDialogOpen(true)}
        rulersEnabled={rulersEnabled}
        onToggleRulers={() => setRulersEnabled(!rulersEnabled)}
        onPresent={() => setPresentationOpen(true)}
        onShare={() => setShareOpen(true)}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden border-t border-border/80">
        <ToolRail activePanel={activePanel} onToggle={togglePanel} />

        <LeftPanel
          activePanel={activePanel}
          design={design}
          activePage={activePage}
          selectedIds={selectedIds}
          images={images}
          imageUrlByKey={imageUrlByKey}
          csvText={csvText}
          csvInputRef={csvInputRef}
          parsedCsv={parsedCsv}
          onClosePanel={() => setActivePanel(null)}
          updateDesign={updateDesign}
          updateDesignAndRecord={updateDesignAndRecord}
          updateCanvasBg={updateCanvasBg}
          updateActivePage={(patch) => {
            pushUndo();
            updatePage(activePage.id, patch);
          }}
          updatePage={updatePage}
          pushUndo={pushUndo}
          onOpenTemplates={() => {
            setLoadDialogTab("templates");
            setLoadDialogOpen(true);
          }}
          onLoadTemplate={handleLoadTemplate}
          addTextElement={addTextElement}
          addShapeElement={addShapeElement}
          addLineElement={addLineElement}
          addBorderElement={addBorderElement}
          addImageElement={addImageElement}
          addEmojiElement={addEmojiElement}
          setCsvText={setCsvText}
          handleCsvUpload={handleCsvUpload}
          downloadSampleCsv={downloadSampleCsv}
          insertPlaceholder={insertPlaceholder}
          selectElement={selectElement}
          onUpdateDesign={updateDesign}
          updateElementAndRecord={updateElementAndRecord}
          versions={versions}
          isAutoSaving={isAutoSaving}
          onRestoreVersion={restoreVersion}
          onDeleteVersion={deleteVersion}
          onSaveVersion={saveVersion}
          reorderLayer={(fromId, toId) => {
            pushUndo();
            reorderLayer(fromId, toId);
          }}
        />

        <CanvasWorkspace
          design={design}
          activePage={activePage}
          selectedElement={selectedElement}
          selectedIds={selectedIds}
          sortedElements={sortedElements}
          stageScale={stageScale}
          baseScale={baseScale}
          zoom={zoom}
          guides={guides}
          marquee={marquee}
          rulersEnabled={rulersEnabled}
          inspectorOpen={inspectorOpen}
          csvHeaders={parsedCsv.headers}
          workspaceRef={workspaceRef}
          images={images}
          imageUrlByKey={imageUrlByKey}
          progress={progress}
          generating={generating}
          lastCreatedIds={lastCreatedIds}
          previewAnimating={previewAnimating}
          onCanvasPointerDown={handleCanvasPointerDown}
          onContextMenu={handleContextMenu}
          renderElement={renderElement}
          updateElementAndRecord={updateElementAndRecord}
          pushUndo={pushUndo}
          duplicateSelected={duplicateSelected}
          deleteSelected={deleteSelected}
          bringToFront={bringToFront}
          sendToBack={sendToBack}
          insertPlaceholder={insertPlaceholder}
          setInspectorOpen={setInspectorOpen}
          handleAlign={handleAlign}
          handleDistribute={handleDistribute}
          setZoom={setZoom}
          handleCreateVideos={handleCreateVideos}
          downloadGeneratedAsZip={downloadGeneratedAsZip}
          zipDownloading={zipDownloading}
          handleSelectPage={handleSelectPage}
          handleAddPage={handleAddPage}
          handleDuplicatePage={handleDuplicatePage}
          handleDeletePage={handleDeletePage}
          handleReorderPages={handleReorderPages}
          updatePage={updatePage}
          handlePreviewAnimations={handlePreviewAnimations}
          panOffset={panOffset}
          onPanChange={setPanOffset}
          multiSelectBounds={multiSelectBounds}
          onMultiSelectResize={handleMultiSelectResize}
          onMultiSelectResizeEnd={resetMultiSelectResizeUndoState}
          gridEnabled={gridEnabled}
          onToggleGrid={() => setGridEnabled(!gridEnabled)}
          onOpenVideoSettings={() => setVideoSettingsOpen(true)}
          rowsCount={parsedCsv.rows.length}
        />

        <RightInspector
          selectedElement={selectedElement}
          inspectorOpen={inspectorOpen}
          csvHeaders={parsedCsv.headers}
          images={images}
          imageUrlByKey={imageUrlByKey}
          updateElementAndRecord={updateElementAndRecord}
          pushUndo={pushUndo}
          duplicateSelected={duplicateSelected}
          deleteSelected={deleteSelected}
          bringToFront={bringToFront}
          sendToBack={sendToBack}
          insertPlaceholder={insertPlaceholder}
          openImagePickerForElement={openImagePickerForElement}
          lockToggle={lockToggle}
          setCropImageUrl={setCropImageUrl}
          setCropOpen={setCropOpen}
          setInspectorOpen={setInspectorOpen}
        />
      </div>

      {/* Animation Timeline */}
      {activePage.elements.length > 0 && (
        <div className="shrink-0 border-t border-border/80 bg-panel">
          {animationTimelineOpen ? (
            <AnimationTimeline
              elements={activePage.elements}
              pageDurationMs={activePage.durationMs || 5000}
              selectedElementId={selectedIds[0] || null}
              onSelectElement={(id) => {
                if (id) {
                  selectElement(id);
                }
              }}
              onUpdateAnimation={(elementId, animation) => {
                updateElementAndRecord(elementId, {
                  animation,
                });
              }}
              onClose={() => setAnimationTimelineOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAnimationTimelineOpen(true)}
              className="flex w-full items-center justify-center gap-2 px-4 py-2 text-xs text-muted hover:bg-bg hover:text-text transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="6" y1="8" x2="10" y2="8" />
                <line x1="14" y1="8" x2="18" y2="8" />
                <line x1="6" y1="12" x2="14" y2="12" />
                <line x1="10" y1="16" x2="16" y2="16" />
              </svg>
              Show Animation Timeline
            </button>
          )}
        </div>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        title="Upload images"
        onChange={handleImageInputChange}
      />

      <React.Suspense fallback={null}>
        <BulkPreviewModal
          open={bulkPreviewOpen}
          onClose={() => setBulkPreviewOpen(false)}
          items={bulkPreviewItems}
          loading={bulkPreviewLoading}
          design={design}
          rowsCount={parsedCsv.rows.length}
          zipDownloading={zipDownloading}
          generating={generating}
          onDownloadZip={downloadPreviewAsZip}
          onGenerate={generateBulkImages}
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <ExportDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          design={design}
          exportScale={exportScale}
          exportQuality={exportQuality}
          exportTransparent={exportTransparent}
          onScaleChange={setExportScale}
          onQualityChange={setExportQuality}
          onTransparentChange={setExportTransparent}
          onExportPng={() => downloadPreview()}
          onExportJpeg={exportAsJPEG}
          onExportPdf={exportAsPdf}
          onExportSvg={exportAsSvg}
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <SaveDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          design={design}
          onUpdateDesign={updateDesign}
          onSave={handleSaveDesign}
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <LoadDialog
          open={loadDialogOpen}
          onClose={() => setLoadDialogOpen(false)}
          initialTab={loadDialogTab}
          savedDesigns={savedDesigns}
          onDeleteDesign={deleteSavedDesign}
          onLoadDesign={handleLoadDesign}
          onLoadTemplate={handleLoadTemplate}
        />
      </React.Suspense>

      {presentationOpen && (
        <PresentationMode
          design={design}
          previewRow={previewRow}
          images={images}
          imageUrlByKey={imageUrlByKey}
          onClose={() => setPresentationOpen(false)}
        />
      )}

      {shareOpen && (
        <ShareModal
          design={design}
          onClose={() => setShareOpen(false)}
        />
      )}

      <VideoAnimationSettings
        open={videoSettingsOpen}
        onClose={() => setVideoSettingsOpen(false)}
        onApply={(preset, audio) => {
          setVideoAnimPreset(preset);
          setVideoAudio(audio);
        }}
        initialPreset={videoAnimPreset}
        initialAudio={videoAudio}
      />

      <VideoGenerationModal
        open={videoGenOpen}
        onClose={() => setVideoGenOpen(false)}
        videoGenerating={videoGenerating}
        videoGenStatuses={videoGenStatuses}
      />

      {cropOpen && selectedElement?.type === "image" && (
        <ImageCropModal
          open={cropOpen}
          imageUrl={cropImageUrl}
          onClose={() => setCropOpen(false)}
          onApply={(crop) => {
            if (selectedElement?.type === "image") {
              updateElementAndRecord(selectedElement.id, { crop });
            }
            setCropOpen(false);
          }}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elements={activePage.elements}
          selectedIds={selectedIds}
          onClose={() => setContextMenu(null)}
          onCopy={() => {
            copy();
            setContextMenu(null);
          }}
          onCut={() => {
            pushUndo();
            cut();
            setContextMenu(null);
          }}
          onPaste={() => {
            pushUndo();
            paste();
            setContextMenu(null);
          }}
          onPasteInPlace={() => {
            pushUndo();
            pasteInPlace();
            setContextMenu(null);
          }}
          onDuplicate={() => {
            pushUndo();
            duplicateSelected();
            setContextMenu(null);
          }}
          onDelete={() => {
            pushUndo();
            deleteSelected();
            setContextMenu(null);
          }}
          onBringToFront={() => {
            pushUndo();
            bringToFront();
            setContextMenu(null);
          }}
          onSendToBack={() => {
            pushUndo();
            sendToBack();
            setContextMenu(null);
          }}
          onLockToggle={() => {
            pushUndo();
            lockToggle();
            setContextMenu(null);
          }}
          onGroup={() => {
            pushUndo();
            groupSelected();
            setContextMenu(null);
          }}
          onUngroup={() => {
            pushUndo();
            ungroupSelected();
            setContextMenu(null);
          }}
          onAlign={(dir) => {
            handleAlign(dir);
            setContextMenu(null);
          }}
          onSelectAllOfType={(type) => {
            selectAllOfType(type);
            setContextMenu(null);
          }}
          clipboardEmpty={!clipboard}
        />
      )}
    </div>
  );
}



export { InspectorPanel } from "./bulk-editor/InspectorPanel";
