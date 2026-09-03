import type { TetrominoType } from "../../game/types";

export type TSpinKind = "none" | "mini" | "full";

export function nextCombo(combo: number, linesCleared: number): number {
  return linesCleared > 0 ? combo + 1 : 0;
}

export function isB2BQualifying(linesCleared: number, tSpin: TSpinKind): boolean {
  if (linesCleared <= 0) return false;
  return linesCleared === 4 || tSpin !== "none";
}

/** No-line-clear keeps B2B. Qualifying clear sets it. Other clears break it. */
export function nextBackToBack(
  backToBack: boolean,
  linesCleared: number,
  tSpin: TSpinKind,
): boolean {
  if (linesCleared <= 0) return backToBack;
  return isB2BQualifying(linesCleared, tSpin);
}

export function applyHold(input: {
  current: TetrominoType;
  hold: TetrominoType | null;
  nextQueue: TetrominoType[];
  canHold: boolean;
}): {
  ok: boolean;
  current: TetrominoType | null;
  hold: TetrominoType | null;
  nextQueue: TetrominoType[];
  canHold: boolean;
} {
  if (!input.canHold) {
    return { ok: false, current: input.current, hold: input.hold, nextQueue: input.nextQueue, canHold: false };
  }
  if (input.hold === null) {
    const [incoming, ...rest] = input.nextQueue;
    if (!incoming) {
      return { ok: false, current: input.current, hold: input.hold, nextQueue: input.nextQueue, canHold: true };
    }
    return {
      ok: true,
      current: incoming,
      hold: input.current,
      nextQueue: rest,
      canHold: false,
    };
  }
  return {
    ok: true,
    current: input.hold,
    hold: input.current,
    nextQueue: input.nextQueue,
    canHold: false,
  };
}
