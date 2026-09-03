import type { Placement, EvalFeatures } from "../ai/types";
import type { TetrisGameState } from "../core/state";
import type { TSpinKind } from "../core/mechanics";
import type { TetrominoType } from "../game/types";

export type GapCategory =
  | "immediate_line_clear"
  | "future_setup"
  | "tspin_setup"
  | "b2b"
  | "ren"
  | "downstack"
  | "i_well"
  | "hold"
  | "board_shape"
  | "search_horizon"
  | "unknown"
  | "agree";

export interface Confidence {
  board: number;
  current: number;
  next: number;
  hold: number;
  action: number;
}

export interface HumanAction {
  spawn: boolean;
  hold: boolean;
  rotation: number;
  x: number;
  y: number;
  hardDrop: boolean;
  pieceType: TetrominoType | null;
  linesCleared: number;
  tSpin: TSpinKind;
  comboAfter: number;
  b2bAfter: boolean;
}

export interface ReplayStep {
  index: number;
  timestamp: number;
  stateBefore: TetrisGameState;
  stateAfter: TetrisGameState;
  human: HumanAction;
  confidence: Confidence;
  source: "video" | "fixture";
}

export interface RankedChoice {
  placement: Placement | null;
  score: number;
  rank: number | null;
  inTop1: boolean;
  inTop3: boolean;
  inTop5: boolean;
  inTop10: boolean;
  inCandidates: boolean;
  candidateCount: number;
  aiPlacement: Placement | null;
  aiScore: number;
  humanScore: number | null;
}

export interface DecisionGap {
  step: ReplayStep;
  ranked: RankedChoice;
  category: GapCategory;
  reason: string;
  missingFeature: string;
  confidence: number;
  humanFeatures: EvalFeatures;
  aiFeatures: EvalFeatures | null;
}

export interface AgreementStats {
  compared: number;
  top1: number;
  top3: number;
  top5: number;
  top10: number;
  outside: number;
  holdUsed: number;
  avgRank: number;
  avgHumanScore: number;
  avgAiScore: number;
}

export interface DatasetStats {
  source: string;
  durationSec: number;
  frames: number;
  validStates: number;
  validActions: number;
  meanConfidence: Confidence;
  missingRate: number;
}

export interface BehaviorStats {
  holdRate: number;
  tSpinSetupRate: number;
  b2bPreserveRate: number;
  renPreserveRate: number;
  downstackShare: number;
  iWellShare: number;
  futureSetupShare: number;
  humanImmediateBetter: number;
  humanImmediateBetterRate: number;
}
