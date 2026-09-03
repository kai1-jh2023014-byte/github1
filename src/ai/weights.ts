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

export function cloneWeights(weights: EvalWeights): EvalWeights {
  return { ...weights };
}
