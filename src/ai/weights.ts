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
}

export const ZERO_MECHANICS: MechanicsWeights = {
  tSpin: 0,
  tSpinMini: 0,
  combo: 0,
  backToBack: 0,
  perfectClear: 0,
  holdI: 0,
};

export const DEFAULT_MECHANICS: MechanicsWeights = {
  tSpin: 0.85,
  tSpinMini: 0.08,
  combo: 0.12,
  backToBack: 0.22,
  perfectClear: 1.6,
  holdI: 0.12,
};

export function cloneWeights(weights: EvalWeights): EvalWeights {
  return { ...weights };
}
