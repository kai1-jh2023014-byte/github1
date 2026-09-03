import { computeFeatures } from "../ai/evaluator";
import { generateMovesWithSpins } from "../ai/moveGenerator";
import { applyHold } from "../core/mechanics/hold";
import type { TetrisGameState } from "../core/state";
import type { Placement } from "../ai/types";
import type { TetrominoType } from "../game/types";
import { deepestWell, filledWellColumn, tSpinReadyCount } from "./shape";
import { applyAction } from "./state";
import type { HumanAction } from "./types";

/**
 * Research-only guideline-style chooser. Not a neural net and not the live AI.
 * Encodes well / T-spin-slot / I-hold preferences that Beam 3×12 does not.
 */
export function chooseExpertAction(state: TetrisGameState): HumanAction | null {
  const options = expertOptions(state);
  if (options.length === 0) return null;
  options.sort((a, b) => b.score - a.score);
  return options[0]!.action;
}

function expertOptions(state: TetrisGameState): { action: HumanAction; score: number }[] {
  if (!state.current) return [];
  const out: { action: HumanAction; score: number }[] = [];
  pushPlacements(state, false, state.current.type, state.holdPiece, out);
  if (state.canHold) {
    const held = applyHold({
      current: state.current.type,
      hold: state.holdPiece,
      nextQueue: state.nextPieces,
      canHold: true,
    });
    if (held.ok && held.current) {
      pushPlacements(state, true, held.current, held.hold, out);
    }
  }
  return out;
}

function pushPlacements(
  state: TetrisGameState,
  hold: boolean,
  type: TetrominoType,
  holdAfter: TetrominoType | null,
  out: { action: HumanAction; score: number }[],
): void {
  const wellBefore = deepestWell(state.board);
  for (const move of generateMovesWithSpins(state.board, type)) {
    const applied = applyAction(state, {
      hold,
      rotation: move.placement.rotation,
      x: move.placement.x,
    });
    if (!applied) continue;
    const score = scoreExpert(state, applied.next, applied.applied, wellBefore, holdAfter, type);
    out.push({ action: applied.applied, score });
  }
}

function scoreExpert(
  before: TetrisGameState,
  after: TetrisGameState,
  action: HumanAction,
  wellBefore: { col: number; depth: number },
  holdAfter: TetrominoType | null,
  placedType: TetrominoType,
): number {
  const features = computeFeatures(after.board, action.linesCleared);
  const wellAfter = deepestWell(after.board);
  const readyAfter = tSpinReadyCount(after.board);
  const readyBefore = tSpinReadyCount(before.board);
  const filledWell = filledWellColumn(before.board, after.board, wellBefore);
  const junkInWell = filledWell && placedType !== "I";
  const tetris = action.linesCleared === 4 ? 1 : 0;
  const savedI = holdAfter === "I" ? 1 : 0;
  const usedIForTetris = placedType === "I" && tetris ? 1 : 0;
  const wastedI = placedType === "I" && action.linesCleared < 4 && wellBefore.depth >= 3 ? 1 : 0;
  const tSetupGain = readyAfter.full - readyBefore.full;

  return (
    features.holes * -0.95 +
    features.aggregateHeight * -0.42 +
    features.bumpiness * -0.12 +
    features.maxHeight * -0.38 +
    features.density * 0.28 +
    action.linesCleared * 0.28 +
    tetris * 3.1 +
    (action.tSpin === "full" ? 2.4 : 0) +
    (action.tSpin === "mini" ? 0.4 : 0) +
    wellAfter.depth * 0.35 +
    (wellAfter.depth >= 4 ? 1.4 : 0) +
    readyAfter.full * 1.6 +
    tSetupGain * 1.1 +
    after.combo * 0.18 +
    (after.backToBack ? 0.55 : 0) +
    savedI * 0.85 +
    usedIForTetris * 2.2 +
    (junkInWell ? -3.4 : 0) +
    (wastedI ? -1.6 : 0) +
    (action.hold && placedType !== "I" && holdAfter !== "I" ? -0.25 : 0)
  );
}

export function expertPlacement(state: TetrisGameState): Placement | null {
  const action = chooseExpertAction(state);
  if (!action) return null;
  return {
    hold: action.hold,
    rotation: action.rotation,
    x: action.x,
    y: action.y,
  };
}
