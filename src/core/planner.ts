import type { Placement } from "../ai/types";
import type { ActivePiece } from "../game/types";
import type { TetrisAction } from "./actions";

export function planActions(current: ActivePiece, target: Placement): TetrisAction[] {
  const actions: TetrisAction[] = [];
  let rotation = current.rotation;
  while (rotation !== target.rotation) {
    actions.push({ type: "rotateCW" });
    rotation = (rotation + 1) % 4;
  }
  let x = current.x;
  while (x < target.x) {
    actions.push({ type: "moveRight" });
    x += 1;
  }
  while (x > target.x) {
    actions.push({ type: "moveLeft" });
    x -= 1;
  }
  actions.push({ type: "hardDrop" });
  return actions;
}

export function nextLiveAction(
  current: ActivePiece,
  target: Placement,
): TetrisAction | null {
  if (current.rotation !== target.rotation) return { type: "rotateCW" };
  if (current.x < target.x) return { type: "moveRight" };
  if (current.x > target.x) return { type: "moveLeft" };
  return { type: "hardDrop" };
}
