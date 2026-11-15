import type { DesignElement } from "@/lib/bulkImageTypes";

export type EditorPanel =
  | "design"
  | "elements"
  | "text"
  | "uploads"
  | "csv"
  | "layers"
  | "brand"
  | "versions"
  | null;

export type ResizeHandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface DragState {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  original: DesignElement;
  shiftKey: boolean;
  didMove: boolean;
  resizeHandle?: ResizeHandlePosition;
}

export interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}
