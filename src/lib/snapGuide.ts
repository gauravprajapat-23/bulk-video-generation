import type { DesignElement } from "./bulkImageTypes";

export interface SnapLine {
  id: string;
  type: "horizontal" | "vertical";
  position: number;
}

const SNAP_THRESHOLD = 5;
const SPACING_THRESHOLD = 8;

interface ElementBounds {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

function getElementBounds(el: DesignElement): ElementBounds {
  return {
    id: el.id,
    left: el.x,
    right: el.x + el.width,
    top: el.y,
    bottom: el.y + el.height,
    centerX: el.x + el.width / 2,
    centerY: el.y + el.height / 2,
    width: el.width,
    height: el.height,
  };
}

function getCanvasGuides(canvasWidth: number, canvasHeight: number): ElementBounds {
  return {
    id: "__canvas__",
    left: 0,
    right: canvasWidth,
    top: 0,
    bottom: canvasHeight,
    centerX: canvasWidth / 2,
    centerY: canvasHeight / 2,
    width: canvasWidth,
    height: canvasHeight,
  };
}

export function computeSnapLines(
  movingElement: DesignElement,
  allElements: DesignElement[],
  canvasWidth: number,
  canvasHeight: number
): { snappedX: number; snappedY: number; guides: SnapLine[] } {
  const moving = getElementBounds(movingElement);
  const guides: SnapLine[] = [];
  let snappedX = movingElement.x;
  let snappedY = movingElement.y;

  const others = allElements
    .filter((el) => el.id !== movingElement.id)
    .map(getElementBounds);
  const canvas = getCanvasGuides(canvasWidth, canvasHeight);
  const targets = [...others, canvas];

  let closestDx = SNAP_THRESHOLD + 1;
  let closestDy = SNAP_THRESHOLD + 1;
  let snapEdgeX = 0;
  let snapEdgeY = 0;

  for (const target of targets) {
    const checks = [
      { movingEdge: moving.left, targetEdge: target.left, type: "left" as const },
      { movingEdge: moving.left, targetEdge: target.right, type: "left" as const },
      { movingEdge: moving.right, targetEdge: target.left, type: "right" as const },
      { movingEdge: moving.right, targetEdge: target.right, type: "right" as const },
      { movingEdge: moving.centerX, targetEdge: target.centerX, type: "centerX" as const },
    ];

    for (const check of checks) {
      const dx = check.targetEdge - check.movingEdge;
      if (Math.abs(dx) < Math.abs(closestDx)) {
        closestDx = dx;
        snapEdgeX = check.targetEdge;
      }
    }

    const verticalChecks = [
      { movingEdge: moving.top, targetEdge: target.top, type: "top" as const },
      { movingEdge: moving.top, targetEdge: target.bottom, type: "top" as const },
      { movingEdge: moving.bottom, targetEdge: target.top, type: "bottom" as const },
      { movingEdge: moving.bottom, targetEdge: target.bottom, type: "bottom" as const },
      { movingEdge: moving.centerY, targetEdge: target.centerY, type: "centerY" as const },
    ];

    for (const check of verticalChecks) {
      const dy = check.targetEdge - check.movingEdge;
      if (Math.abs(dy) < Math.abs(closestDy)) {
        closestDy = dy;
        snapEdgeY = check.targetEdge;
      }
    }
  }

  if (Math.abs(closestDx) <= SNAP_THRESHOLD) {
    snappedX = movingElement.x + closestDx;
    guides.push({
      id: `snap-v-${snapEdgeX}`,
      type: "vertical",
      position: snapEdgeX,
    });
  }

  if (Math.abs(closestDy) <= SNAP_THRESHOLD) {
    snappedY = movingElement.y + closestDy;
    guides.push({
      id: `snap-h-${snapEdgeY}`,
      type: "horizontal",
      position: snapEdgeY,
    });
  }

  if (others.length >= 2) {
    const sortedByLeftX = [...others].sort((a, b) => a.left - b.left);
    const sortedByTopY = [...others].sort((a, b) => a.top - b.top);

    for (let i = 0; i < sortedByLeftX.length - 1; i++) {
      const el1 = sortedByLeftX[i];
      const el2 = sortedByLeftX[i + 1];
      const spacing = el2.left - el1.right;
      const expectedSpacing = (el1.width + el2.width) / 2;

      if (Math.abs(spacing - expectedSpacing) < SPACING_THRESHOLD) {
        const snapLeft = el1.right + expectedSpacing;
        const dxLeft = snapLeft - moving.left;
        const snapRight = el2.left - expectedSpacing;
        const dxRight = snapRight - moving.left;

        if (Math.abs(dxLeft) < Math.abs(closestDx)) {
          closestDx = dxLeft;
          snappedX = movingElement.x + dxLeft;
          guides.push({
            id: `snap-spacing-h-${snapLeft}`,
            type: "vertical",
            position: snapLeft,
          });
        } else if (Math.abs(dxRight) < Math.abs(closestDx)) {
          closestDx = dxRight;
          snappedX = movingElement.x + dxRight;
          guides.push({
            id: `snap-spacing-h-${snapRight}`,
            type: "vertical",
            position: snapRight,
          });
        }
      }
    }

    for (let i = 0; i < sortedByTopY.length - 1; i++) {
      const el1 = sortedByTopY[i];
      const el2 = sortedByTopY[i + 1];
      const spacing = el2.top - el1.bottom;
      const expectedSpacing = (el1.height + el2.height) / 2;

      if (Math.abs(spacing - expectedSpacing) < SPACING_THRESHOLD) {
        const snapTop = el1.bottom + expectedSpacing;
        const dyTop = snapTop - moving.top;
        const snapBottom = el2.top - expectedSpacing;
        const dyBottom = snapBottom - moving.top;

        if (Math.abs(dyTop) < Math.abs(closestDy)) {
          closestDy = dyTop;
          snappedY = movingElement.y + dyTop;
          guides.push({
            id: `snap-spacing-v-${snapTop}`,
            type: "horizontal",
            position: snapTop,
          });
        } else if (Math.abs(dyBottom) < Math.abs(closestDy)) {
          closestDy = dyBottom;
          snappedY = movingElement.y + dyBottom;
          guides.push({
            id: `snap-spacing-v-${snapBottom}`,
            type: "horizontal",
            position: snapBottom,
          });
        }
      }
    }
  }

  return { snappedX, snappedY, guides };
}
