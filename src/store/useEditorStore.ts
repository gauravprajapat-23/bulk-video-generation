"use client";

import { create } from "zustand";
import { newId, nowIso } from "@/lib/id";
import {
  createBlankPage,
  normalizeDesign,
  type BulkImageDesign,
  type DesignElement,
  type DesignPage,
  type CustomField,
} from "@/lib/bulkImageTypes";
import { nextZIndex } from "@/lib/utils";

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 3;

interface ClipboardState {
  elements: DesignElement[];
  operation: "copy" | "cut";
}

interface EditorState {
  design: BulkImageDesign;
  activePageId: string;
  selectedIds: string[];
  editingElementId: string | null;
  clipboard: ClipboardState | null;
  undoStack: BulkImageDesign[];
  redoStack: BulkImageDesign[];
  undoDepth: number;
  redoDepth: number;
  guides: import("@/lib/snapGuide").SnapLine[];
  zoom: number;
  snapEnabled: boolean;
  gridEnabled: boolean;
  panOffset: { x: number; y: number };
  savedDesigns: BulkImageDesign[];

  setDesign: (design: BulkImageDesign) => void;
  updateDesign: (patch: Partial<BulkImageDesign>) => void;

  // Pages
  addPage: () => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  setActivePage: (id: string) => void;
  updatePage: (id: string, patch: Partial<DesignPage>) => void;

  selectElement: (id: string | null) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  selectAllOfType: (type: "text" | "image" | "shape") => void;
  clearSelection: () => void;
  setEditingElement: (id: string | null) => void;

  addElement: (element: DesignElement) => void;
  updateElement: (id: string, patch: Partial<DesignElement>) => void;
  updateElements: (ids: string[], patch: Partial<DesignElement>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  lockToggle: () => void;

  bringToFront: () => void;
  sendToBack: () => void;

  copy: () => void;
  cut: () => void;
  paste: () => void;
  pasteInPlace: () => void;
  pasteWithoutFormatting: () => void;

  groupSelected: () => void;
  ungroupSelected: () => void;
  reorderLayer: (fromId: string, toId: string) => void;

  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  setGuides: (guides: import("@/lib/snapGuide").SnapLine[]) => void;
  setZoom: (zoom: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setGridEnabled: (enabled: boolean) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;

  saveDesign: () => void;
  loadDesign: (design: BulkImageDesign) => void;
  deleteSavedDesign: (id: string) => void;
  loadSavedDesigns: () => void;

  // Custom Fields
  addCustomField: (field: Omit<CustomField, "id">) => void;
  updateCustomField: (id: string, patch: Partial<CustomField>) => void;
  removeCustomField: (id: string) => void;
}

function defaultDesign(): BulkImageDesign {
  const ts = nowIso();
  return {
    id: newId(),
    name: "Untitled Design",
    preset: "youtube_shorts",
    width: 1080,
    height: 1920,
    pages: [createBlankPage("Page 1")],
    customFields: [],
    updatedAt: ts,
  };
}

function cloneDesign(design: BulkImageDesign): BulkImageDesign {
  return JSON.parse(JSON.stringify(design)) as BulkImageDesign;
}

function getActivePage(state: { design: BulkImageDesign; activePageId: string }): DesignPage {
  return state.design.pages.find((p) => p.id === state.activePageId) ?? state.design.pages[0];
}

function getSelectedElements(state: EditorState): DesignElement[] {
  const page = getActivePage(state);
  return page.elements.filter((el) => state.selectedIds.includes(el.id));
}

const initialDesign = defaultDesign();

export const useEditorStore = create<EditorState>()((set, get) => ({
  design: initialDesign,
  activePageId: initialDesign.pages[0].id,
  selectedIds: [],
  editingElementId: null,
  clipboard: null,
    undoStack: [],
    redoStack: [],
    undoDepth: 0,
    redoDepth: 0,
  guides: [],
  zoom: 1,
    snapEnabled: true,
    gridEnabled: false,
  panOffset: { x: 0, y: 0 },
  savedDesigns: [],

  setDesign: (design) =>
    set((s) => {
      const normalized = normalizeDesign(design);
      const stillExists = normalized.pages.some((p) => p.id === s.activePageId);
      return { design: normalized, activePageId: stillExists ? s.activePageId : normalized.pages[0].id };
    }),

  updateDesign: (patch) =>
    set((s) => ({
      design: { ...s.design, ...patch, updatedAt: nowIso() },
    })),

  // ---- Pages ----
  addPage: () =>
    set((s) => {
      const lastBg = s.design.pages[s.design.pages.length - 1]?.backgroundColor || "#101827";
      const newPage = createBlankPage(`Page ${s.design.pages.length + 1}`, lastBg);
      return {
        design: { ...s.design, pages: [...s.design.pages, newPage], updatedAt: nowIso() },
        activePageId: newPage.id,
        selectedIds: [],
        editingElementId: null,
      };
    }),

  duplicatePage: (id) =>
    set((s) => {
      const index = s.design.pages.findIndex((p) => p.id === id);
      if (index === -1) return {};
      const source = s.design.pages[index];
      const clonedSource = cloneDesign({ ...s.design, pages: [source] }).pages[0];
      const newPage: DesignPage = {
        ...clonedSource,
        id: newId(),
        name: `${source.name} copy`,
        elements: clonedSource.elements.map((el) => ({ ...el, id: newId() })) as DesignElement[],
      };
      const pages = [...s.design.pages];
      pages.splice(index + 1, 0, newPage);
      return {
        design: { ...s.design, pages, updatedAt: nowIso() },
        activePageId: newPage.id,
        selectedIds: [],
        editingElementId: null,
      };
    }),

  deletePage: (id) =>
    set((s) => {
      if (s.design.pages.length <= 1) return {};
      const pages = s.design.pages.filter((p) => p.id !== id);
      const activePageId = s.activePageId === id ? pages[0].id : s.activePageId;
      return {
        design: { ...s.design, pages, updatedAt: nowIso() },
        activePageId,
        selectedIds: [],
        editingElementId: null,
      };
    }),

  reorderPages: (fromIndex, toIndex) =>
    set((s) => {
      if (fromIndex === toIndex) return {};
      const pages = [...s.design.pages];
      const [moved] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, moved);
      return { design: { ...s.design, pages, updatedAt: nowIso() } };
    }),

  setActivePage: (id) => set({ activePageId: id, selectedIds: [], editingElementId: null }),

  updatePage: (id, patch) =>
    set((s) => ({
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      },
    })),

  // ---- Selection ----
  selectElement: (id) => set({ selectedIds: id ? [id] : [], editingElementId: null }),
  toggleSelect: (id) =>
    set((s) => {
      const exists = s.selectedIds.includes(id);
      return {
        selectedIds: exists ? s.selectedIds.filter((sid) => sid !== id) : [...s.selectedIds, id],
        editingElementId: null,
      };
    }),
  selectAll: () =>
    set((s) => {
      const page = getActivePage(s);
      return { selectedIds: page.elements.filter((el) => !el.locked).map((el) => el.id) };
    }),
  selectAllOfType: (type) =>
    set((s) => {
      const page = getActivePage(s);
      const typeMap: Record<string, string[]> = {
        text: ["text"],
        image: ["image"],
        shape: ["rect", "ellipse", "triangle", "star", "arrow", "diamond"],
      };
      const allowedTypes = typeMap[type] || [];
      return {
        selectedIds: page.elements
          .filter((el) => !el.locked && allowedTypes.includes(el.type))
          .map((el) => el.id),
      };
    }),
  clearSelection: () => set({ selectedIds: [], editingElementId: null }),
  setEditingElement: (id) => set({ editingElementId: id }),

  // ---- Elements (always operate on the active page) ----
  addElement: (element) =>
    set((s) => {
      const page = getActivePage(s);
      return {
        design: {
          ...s.design,
          updatedAt: nowIso(),
          pages: s.design.pages.map((p) =>
            p.id === page.id ? { ...p, elements: [...p.elements, element] } : p
          ),
        },
        selectedIds: [element.id],
      };
    }),

  updateElement: (id, patch) =>
    set((s) => ({
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) => {
          const found = p.elements.some((el) => el.id === id);
          if (!found) return p;
          return { ...p, elements: p.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as DesignElement) : el)) };
        }),
      },
    })),

  updateElements: (ids, patch) =>
    set((s) => ({
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) => {
          const hasAny = p.elements.some((el) => ids.includes(el.id));
          if (!hasAny) return p;
          return { ...p, elements: p.elements.map((el) => (ids.includes(el.id) ? ({ ...el, ...patch } as DesignElement) : el)) };
        }),
      },
    })),

  deleteSelected: () =>
    set((s) => {
      const page = getActivePage(s);
      return {
        design: {
          ...s.design,
          updatedAt: nowIso(),
          pages: s.design.pages.map((p) =>
            p.id === page.id ? { ...p, elements: p.elements.filter((el) => !s.selectedIds.includes(el.id)) } : p
          ),
        },
        selectedIds: [],
        editingElementId: null,
      };
    }),

  duplicateSelected: () => {
    const state = get();
    const page = getActivePage(state);
    const selected = getSelectedElements(state);
    if (!selected.length) return;

    let baseZ = nextZIndex(page.elements);
    const clones: DesignElement[] = selected.map((el) => ({
      ...el,
      id: newId(),
      name: `${el.name} copy`,
      x: el.x + 32,
      y: el.y + 32,
      zIndex: baseZ++,
    })) as DesignElement[];

    set((s) => ({
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) =>
          p.id === page.id ? { ...p, elements: [...p.elements, ...clones] } : p
        ),
      },
      selectedIds: clones.map((c) => c.id),
    }));
  },

  lockToggle: () =>
    set((s) => {
      const page = getActivePage(s);
      const selected = page.elements.filter((el) => s.selectedIds.includes(el.id));
      const allLocked = selected.length > 0 && selected.every((el) => el.locked);
      return {
        design: {
          ...s.design,
          updatedAt: nowIso(),
          pages: s.design.pages.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  elements: p.elements.map((el) =>
                    s.selectedIds.includes(el.id) ? ({ ...el, locked: !allLocked } as DesignElement) : el
                  ),
                }
              : p
          ),
        },
      };
    }),

  bringToFront: () =>
    set((s) => {
      const page = getActivePage(s);
      const maxZ = nextZIndex(page.elements);
      const selectedEls = page.elements
        .filter((el) => s.selectedIds.includes(el.id))
        .sort((a, b) => a.zIndex - b.zIndex);
      const zMap = new Map<string, number>();
      selectedEls.forEach((el, i) => {
        zMap.set(el.id, maxZ + i);
      });
      return {
        design: {
          ...s.design,
          updatedAt: nowIso(),
          pages: s.design.pages.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  elements: p.elements.map((el) =>
                    zMap.has(el.id) ? ({ ...el, zIndex: zMap.get(el.id)! } as DesignElement) : el
                  ),
                }
              : p
          ),
        },
      };
    }),

  sendToBack: () =>
    set((s) => {
      const page = getActivePage(s);
      const minZ = page.elements.length ? Math.min(...page.elements.map((el) => el.zIndex)) : 0;
      const selectedEls = page.elements
        .filter((el) => s.selectedIds.includes(el.id))
        .sort((a, b) => a.zIndex - b.zIndex);
      const zMap = new Map<string, number>();
      selectedEls.forEach((el, i) => {
        zMap.set(el.id, minZ - selectedEls.length + i);
      });
      return {
        design: {
          ...s.design,
          updatedAt: nowIso(),
          pages: s.design.pages.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  elements: p.elements.map((el) =>
                    zMap.has(el.id) ? ({ ...el, zIndex: zMap.get(el.id)! } as DesignElement) : el
                  ),
                }
              : p
          ),
        },
      };
    }),

  copy: () =>
    set((s) => {
      const selected = getSelectedElements(s);
      if (!selected.length) return {};
      return {
        clipboard: {
          elements: cloneDesign({ ...s.design, pages: [{ ...getActivePage(s), elements: selected }] }).pages[0]
            .elements as DesignElement[],
          operation: "copy" as const,
        },
      };
    }),

  cut: () => {
    const state = get();
    const page = getActivePage(state);
    const selected = getSelectedElements(state);
    if (!selected.length) return;

    set((s) => ({
      clipboard: {
        elements: cloneDesign({ ...s.design, pages: [{ ...page, elements: selected }] }).pages[0]
          .elements as DesignElement[],
        operation: "cut" as const,
      },
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) =>
          p.id === page.id ? { ...p, elements: p.elements.filter((el) => !s.selectedIds.includes(el.id)) } : p
        ),
      },
      selectedIds: [],
      editingElementId: null,
    }));
  },

  paste: () => {
    const state = get();
    if (!state.clipboard) return;
    const page = getActivePage(state);

    const newElements = state.clipboard.elements.map((el) => ({
      ...el,
      id: newId(),
      x: el.x + 20,
      y: el.y + 20,
      zIndex: nextZIndex(page.elements),
    })) as DesignElement[];

    set((s) => ({
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) =>
          p.id === page.id ? { ...p, elements: [...p.elements, ...newElements] } : p
        ),
      },
      selectedIds: newElements.map((el) => el.id),
      clipboard: s.clipboard?.operation === "cut" ? null : s.clipboard,
    }));
  },

  pasteInPlace: () => {
    const state = get();
    if (!state.clipboard) return;
    const page = getActivePage(state);

    const newElements = state.clipboard.elements.map((el) => ({
      ...el,
      id: newId(),
      zIndex: nextZIndex(page.elements),
    })) as DesignElement[];

    set((s) => ({
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) =>
          p.id === page.id ? { ...p, elements: [...p.elements, ...newElements] } : p
        ),
      },
      selectedIds: newElements.map((el) => el.id),
      clipboard: s.clipboard?.operation === "cut" ? null : s.clipboard,
    }));
  },

  pasteWithoutFormatting: () => {
    const state = get();
    if (!state.clipboard) return;
    const page = getActivePage(state);

    const newElements = state.clipboard.elements.map((el) => {
      const base = { ...el, id: newId(), zIndex: nextZIndex(page.elements) };
      if (el.type === "text") {
        return {
          ...base,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 24,
          fontWeight: "normal",
          fontStyle: "normal",
          textDecoration: "none",
          lineHeight: 1.5,
          letterSpacing: 0,
          textTransform: "none",
        } as unknown as DesignElement;
      }
      return base as DesignElement;
    });

    set((s) => ({
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) =>
          p.id === page.id ? { ...p, elements: [...p.elements, ...newElements] } : p
        ),
      },
      selectedIds: newElements.map((el) => el.id),
      clipboard: s.clipboard?.operation === "cut" ? null : s.clipboard,
    }));
  },

  groupSelected: () => {
    const state = get();
    const page = getActivePage(state);
    const selected = getSelectedElements(state);
    if (selected.length < 2) return;

    const groupId = newId();
    set((s) => ({
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) =>
          p.id === page.id
            ? { ...p, elements: p.elements.map((el) => (s.selectedIds.includes(el.id) ? ({ ...el, groupId } as DesignElement) : el)) }
            : p
        ),
      },
    }));
  },

  ungroupSelected: () => {
    const state = get();
    const page = getActivePage(state);
    const selected = getSelectedElements(state);
    if (!selected.length) return;

    set((s) => ({
      design: {
        ...s.design,
        updatedAt: nowIso(),
        pages: s.design.pages.map((p) =>
          p.id === page.id
            ? { ...p, elements: p.elements.map((el) => (s.selectedIds.includes(el.id) ? ({ ...el, groupId: null } as DesignElement) : el)) }
            : p
        ),
      },
    }));
  },

  reorderLayer: (fromId, toId) =>
    set((s) => {
      const page = getActivePage(s);
      const fromEl = page.elements.find((el) => el.id === fromId);
      const toEl = page.elements.find((el) => el.id === toId);
      if (!fromEl || !toEl) return {};
      const fromZ = fromEl.zIndex;
      const toZ = toEl.zIndex;
      return {
        design: {
          ...s.design,
          updatedAt: nowIso(),
          pages: s.design.pages.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  elements: p.elements.map((el) => {
                    if (el.id === fromId) return { ...el, zIndex: toZ } as DesignElement;
                    if (fromZ < toZ) {
                      if (el.zIndex > fromZ && el.zIndex <= toZ) return { ...el, zIndex: el.zIndex - 1 } as DesignElement;
                    } else {
                      if (el.zIndex >= toZ && el.zIndex < fromZ) return { ...el, zIndex: el.zIndex + 1 } as DesignElement;
                    }
                    return el;
                  }),
                }
              : p
          ),
        },
      };
    }),

  // ---- Undo / redo (whole design, including all pages) ----
  pushUndo: () =>
    set((s) => {
      const newStack = [...s.undoStack.slice(-39), cloneDesign(s.design)];
      return { undoStack: newStack, undoDepth: newStack.length, redoStack: [], redoDepth: 0 };
    }),

  undo: () => {
    const state = get();
    if (!state.undoStack.length) return;
    const previous = state.undoStack[state.undoStack.length - 1];
    set((s) => {
      const stillExists = previous.pages.some((p) => p.id === s.activePageId);
      const newUndo = s.undoStack.slice(0, -1);
      const newRedo = [...s.redoStack, cloneDesign(s.design)];
      return {
        undoStack: newUndo,
        undoDepth: newUndo.length,
        redoStack: newRedo,
        redoDepth: newRedo.length,
        design: previous,
        activePageId: stillExists ? s.activePageId : previous.pages[0].id,
        selectedIds: [],
        editingElementId: null,
      };
    });
  },

  redo: () => {
    const state = get();
    if (!state.redoStack.length) return;
    const next = state.redoStack[state.redoStack.length - 1];
    set((s) => {
      const stillExists = next.pages.some((p) => p.id === s.activePageId);
      const newRedo = s.redoStack.slice(0, -1);
      const newUndo = [...s.undoStack.slice(-39), cloneDesign(s.design)];
      return {
        redoStack: newRedo,
        redoDepth: newRedo.length,
        undoStack: newUndo,
        undoDepth: newUndo.length,
        design: next,
        activePageId: stillExists ? s.activePageId : next.pages[0].id,
        selectedIds: [],
        editingElementId: null,
      };
    });
  },

  setGuides: (guides) => set({ guides }),
  setZoom: (zoom) => set({ zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setGridEnabled: (enabled) => set({ gridEnabled: enabled }),
  setPanOffset: (offset) => set({ panOffset: offset }),

  saveDesign: () => {
    const state = get();
    const designToSave = cloneDesign(state.design);
    const existing = state.savedDesigns.findIndex((d) => d.id === state.design.id);
    let newSaved: BulkImageDesign[];
    if (existing >= 0) {
      newSaved = [...state.savedDesigns];
      newSaved[existing] = designToSave;
    } else {
      newSaved = [...state.savedDesigns, designToSave];
    }
    set({ savedDesigns: newSaved });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("editor-saved-designs", JSON.stringify(newSaved));
    }
  },

  loadDesign: (design) => {
    const normalized = normalizeDesign(design);
    set({
      design: normalized,
      activePageId: normalized.pages[0].id,
      selectedIds: [],
      editingElementId: null,
      undoStack: [],
      redoStack: [],
      panOffset: { x: 0, y: 0 },
    });
  },

  deleteSavedDesign: (id) => {
    set((s) => {
      const newSaved = s.savedDesigns.filter((d) => d.id !== id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("editor-saved-designs", JSON.stringify(newSaved));
      }
      return { savedDesigns: newSaved };
    });
  },

  loadSavedDesigns: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("editor-saved-designs");
      if (raw) {
        const saved = (JSON.parse(raw) as any[]).map((d) => normalizeDesign(d));
        set({ savedDesigns: saved });
      }
    } catch {
      // ignore parse errors
    }
  },

  addCustomField: (field) =>
    set((s) => {
      const newField: CustomField = { ...field, id: newId() };
      return {
        design: {
          ...s.design,
          customFields: [...s.design.customFields, newField],
          updatedAt: nowIso(),
        },
      };
    }),

  updateCustomField: (id, patch) =>
    set((s) => ({
      design: {
        ...s.design,
        customFields: s.design.customFields.map((f) =>
          f.id === id ? { ...f, ...patch } : f
        ),
        updatedAt: nowIso(),
      },
    })),

  removeCustomField: (id) =>
    set((s) => ({
      design: {
        ...s.design,
        customFields: s.design.customFields.filter((f) => f.id !== id),
        updatedAt: nowIso(),
      },
    })),
}));