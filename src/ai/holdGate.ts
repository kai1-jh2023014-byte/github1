import type { Board, TetrominoType } from "../game/types";
import { canITetris, findTetrisWell, pieceCanOccupyColumn } from "./structure";

export interface HoldGateInput {
  board: Board;
  current: TetrominoType;
  hold: TetrominoType | null;
  nextQueue: TetrominoType[];
  canHold: boolean;
}

/**
 * Board-feature gate. Not an expert-move rule.
 * Only opens a Hold search branch when a tetris well / I reservation
 * makes the swap meaningful. Empty boards and junk swaps stay closed.
 */
export function shouldExploreHold(input: HoldGateInput): boolean {
  if (!input.canHold) return false;
  const well = findTetrisWell(input.board);
  if (!well) return false;

  const iSave =
    input.current === "I" &&
    input.hold !== "I" &&
    well.depth >= 3 &&
    well.depth <= 8 &&
    !canITetris(input.board);
  if (iSave) return true;

  const useHeldI = input.hold === "I" && input.current !== "I" && well.depth >= 4;
  if (useHeldI) return true;

  if (well.depth >= 4 && input.current !== "I" && pieceCanOccupyColumn(input.board, input.current, well.col)) {
    const next = input.nextQueue[0] ?? null;
    if (input.hold === null && next === "I") return true;
    if (input.hold !== null && !pieceCanOccupyColumn(input.board, input.hold, well.col)) {
      return true;
    }
  }

  return false;
}
