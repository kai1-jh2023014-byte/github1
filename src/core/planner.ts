import type { Placement } from "../ai/types";
import type { ActivePiece } from "../game/types";
import type { TetrisAction } from "./actions";

export function planActions(current: ActivePiece, target: Placement): TetrisAction[] {
  if (target.hold) return [{ type: "hold" }];
  const actions: TetrisAction[] = [];
  const pre = target.spinPre;
  let rotation = current.rotation;
  let x = current.x;
  const firstRot = pre?.rotation ?? target.rotation;
  const firstX = pre?.x ?? target.x;
  while (rotation !== firstRot) {
    actions.push({ type: "rotateCW" });
    rotation = (rotation + 1) % 4;
  }
  while (x < firstX) {
    actions.push({ type: "moveRight" });
    x += 1;
  }
  while (x > firstX) {
    actions.push({ type: "moveLeft" });
    x -= 1;
  }
  if (pre) {
    for (let i = 0; i < Math.max(0, pre.y - current.y); i++) {
      actions.push({ type: "softDrop" });
    }
    while (rotation !== target.rotation) {
      actions.push({ type: "rotateCW" });
      rotation = (rotation + 1) % 4;
    }
  }
  actions.push({ type: "hardDrop" });
  return actions;
}

export function nextLiveAction(
  current: ActivePiece,
  target: Placement,
): TetrisAction | null {
  if (target.hold) return { type: "hold" };
  const pre = target.spinPre;
  if (pre && current.y < pre.y) {
    if (current.rotation !== pre.rotation) return { type: "rotateCW" };
    if (current.x < pre.x) return { type: "moveRight" };
    if (current.x > pre.x) return { type: "moveLeft" };
    return { type: "softDrop" };
  }
  if (current.rotation !== target.rotation) return { type: "rotateCW" };
  if (current.x < target.x) return { type: "moveRight" };
  if (current.x > target.x) return { type: "moveLeft" };
  return { type: "hardDrop" };
}
