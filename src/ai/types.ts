export interface EvalWeights {
  linesCleared: number;
  holes: number;
  aggregateHeight: number;
  bumpiness: number;
  maxHeight: number;
  wells: number;
  density: number;
  rowTransitions: number;
  colTransitions: number;
}

export interface EvalFeatures {
  linesCleared: number;
  holes: number;
  aggregateHeight: number;
  bumpiness: number;
  maxHeight: number;
  wells: number;
  density: number;
  rowTransitions: number;
  colTransitions: number;
}

export interface Placement {
  rotation: number;
  x: number;
  y: number;
}

export interface ScoredCandidate {
  placement: Placement;
  score: number;
  features: EvalFeatures;
}

export type SearchDepth = 1 | 2;

export interface SearchResult {
  move: Placement | null;
  bestScore: number;
  candidates: ScoredCandidate[];
  elapsedMs: number;
  depth: SearchDepth;
  nodes: number;
}

export const FEATURE_KEYS: (keyof EvalFeatures)[] = [
  "linesCleared",
  "holes",
  "aggregateHeight",
  "bumpiness",
  "maxHeight",
  "wells",
  "density",
  "rowTransitions",
  "colTransitions",
];
