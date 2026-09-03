export { DEFAULT_WEIGHTS, DEFAULT_MECHANICS, ZERO_MECHANICS, cloneWeights } from "./weights";
export type { MechanicsWeights } from "./weights";
export { computeFeatures, evaluateBoard, scoreFeatures } from "./evaluator";
export { shouldExploreHold } from "./holdGate";
export { findTetrisWell, wellReservationScore, overhangScore } from "./structure";
export { computeFutureFeatures, scoreFuture, SETUP_MEDIUM } from "./future";
export {
  wellShapeQuality,
  scoreWellDelta,
  scoreHoleDelta,
  scoreSurfaceDelta,
  WELL_SMALL,
  HOLE_SMALL,
  SURFACE_SMALL,
} from "./delta";
export { generateMoves, generateMovesWithSpins } from "./moveGenerator";
export { findBestMove } from "./search";
export { AIPlayer } from "./player";
export type {
  EvalFeatures,
  EvalWeights,
  Placement,
  ScoredCandidate,
  SearchDepth,
  SearchResult,
} from "./types";
export { FEATURE_KEYS } from "./types";
