import {
  B2B_MULTIPLIER,
  COMBO_POINTS,
  LINE_SCORES,
  PERFECT_CLEAR_POINTS,
  TSPIN_MINI_SCORES,
  TSPIN_SCORES,
} from "../../game/constants";
import { isB2BQualifying, type TSpinKind } from "./hold";

export function lockScore(input: {
  cleared: number;
  tSpin: TSpinKind;
  combo: number;
  backToBack: boolean;
  level: number;
  perfectClear: boolean;
}): number {
  let base: number = LINE_SCORES[input.cleared] ?? 0;
  if (input.tSpin === "full") base = TSPIN_SCORES[Math.min(input.cleared, 3)] ?? 0;
  if (input.tSpin === "mini") base = TSPIN_MINI_SCORES[Math.min(input.cleared, 3)] ?? 0;
  if (input.cleared === 0 && input.tSpin === "none") return 0;

  let total = base * input.level;
  if (
    input.backToBack &&
    isB2BQualifying(input.cleared, input.tSpin)
  ) {
    total = Math.floor(total * B2B_MULTIPLIER);
  }
  if (input.cleared > 0 && input.combo > 0) {
    total += input.combo * COMBO_POINTS * input.level;
  }
  if (input.perfectClear) total += PERFECT_CLEAR_POINTS * input.level;
  return total;
}
