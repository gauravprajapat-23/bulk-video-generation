import type { DesignElement } from "./bulkImageTypes";

export type AlignDirection = "left" | "center" | "right" | "top" | "middle" | "bottom";

export function alignElements(elements: DesignElement[], direction: AlignDirection, canvasWidth: number, canvasHeight: number): DesignElement[] {
  if (elements.length < 2) return elements;

  const bounds = elements.map((el) => ({
    id: el.id,
    left: el.x,
    right: el.x + el.width,
    top: el.y,
    bottom: el.y + el.height,
    centerX: el.x + el.width / 2,
    centerY: el.y + el.height / 2,
  }));

  let target: number;
  switch (direction) {
    case "left":
      target = Math.min(...bounds.map((b) => b.left));
      return elements.map((el) => {
        const b = bounds.find((bb) => bb.id === el.id)!;
        return { ...el, x: el.x + (target - b.left) };
      });
    case "center":
      target = canvasWidth / 2;
      return elements.map((el) => {
        const b = bounds.find((bb) => bb.id === el.id)!;
        return { ...el, x: el.x + (target - b.centerX) };
      });
    case "right":
      target = Math.max(...bounds.map((b) => b.right));
      return elements.map((el) => {
        const b = bounds.find((bb) => bb.id === el.id)!;
        return { ...el, x: el.x + (target - b.right) };
      });
    case "top":
      target = Math.min(...bounds.map((b) => b.top));
      return elements.map((el) => {
        const b = bounds.find((bb) => bb.id === el.id)!;
        return { ...el, y: el.y + (target - b.top) };
      });
    case "middle":
      target = canvasHeight / 2;
      return elements.map((el) => {
        const b = bounds.find((bb) => bb.id === el.id)!;
        return { ...el, y: el.y + (target - b.centerY) };
      });
    case "bottom":
      target = Math.max(...bounds.map((b) => b.bottom));
      return elements.map((el) => {
        const b = bounds.find((bb) => bb.id === el.id)!;
        return { ...el, y: el.y + (target - b.bottom) };
      });
  }
}

export type DistributeDirection = "horizontal" | "vertical";

export function distributeElements(elements: DesignElement[], direction: DistributeDirection): DesignElement[] {
  if (elements.length < 3) return elements;

  const sorted = [...elements].sort((a, b) => {
    return direction === "horizontal" ? a.x - b.x : a.y - b.y;
  });

  const bounds = sorted.map((el) => ({
    id: el.id,
    start: direction === "horizontal" ? el.x : el.y,
    size: direction === "horizontal" ? el.width : el.height,
  }));

  const totalSize = bounds.reduce((sum, b) => sum + b.size, 0);
  const totalSpan = bounds[bounds.length - 1].start + bounds[bounds.length - 1].size - bounds[0].start;
  const gap = (totalSpan - totalSize) / (bounds.length - 1);

  let currentPos = bounds[0].start;
  const newPositions = new Map<string, number>();

  for (let i = 0; i < bounds.length; i++) {
    newPositions.set(bounds[i].id, currentPos);
    currentPos += bounds[i].size + gap;
  }

  return sorted.map((el) => {
    const newPos = newPositions.get(el.id)!;
    if (direction === "horizontal") {
      return { ...el, x: newPos };
    }
    return { ...el, y: newPos };
  });
}
