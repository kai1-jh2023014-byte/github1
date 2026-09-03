import type { EvalWeights } from "./types";

export const DEFAULT_WEIGHTS: EvalWeights = {
  linesCleared: 0.76,
  holes: -0.36,
  aggregateHeight: -0.51,
  bumpiness: -0.18,
  maxHeight: -0.22,
  wells: -0.20,
  density: 0.35,
  rowTransitions: -0.18,
  colTransitions: -0.45,
};

/** Additive mechanics terms. Zeroed for the 2-ply baseline path. */
export interface MechanicsWeights {
  tSpin: number;
  tSpinMini: number;
  combo: number;
  backToBack: number;
  perfectClear: number;
  holdI: number;
  holdPenalty: number;
}

export const ZERO_MECHANICS: MechanicsWeights = {
  tSpin: 0,
  tSpinMini: 0,
  combo: 0,
  backToBack: 0,
  perfectClear: 0,
  holdI: 0,
  holdPenalty: 0,
};

export const DEFAULT_MECHANICS: MechanicsWeights = {
  tSpin: 0.55,
  tSpinMini: 0.05,
  combo: 0.10,
  backToBack: 0.18,
  perfectClear: 0.4,
  holdI: 0.55,
  holdPenalty: 0.45,
};

export function cloneWeights(weights: EvalWeights): EvalWeights {
  return { ...weights };
}
