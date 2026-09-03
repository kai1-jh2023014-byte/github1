import { BeamSearch } from "../core/beam";
import { evaluateBoard } from "../ai/evaluator";
import { generateMovesWithSpins } from "../ai/moveGenerator";
import { placeAndClear } from "../game/lineClear";
import { DEFAULT_WEIGHTS } from "../ai/weights";
import type { Placement } from "../ai/types";
import type { SearchContext } from "../core/search";
import { frozenSearchContext } from "./frozen";
import { samePlacement } from "./state";
import type { AgreementStats, RankedChoice, ReplayStep } from "./types";

const beam = new BeamSearch();

export function rankHumanVsFrozenBeam(step: ReplayStep): RankedChoice {
  return rankHumanVsBeam(step, frozenSearchContext());
}

export function rankHumanVsBeam(step: ReplayStep, context: SearchContext): RankedChoice {
  const result = beam.search(step.stateBefore, context);
  const human: Placement = {
    hold: step.human.hold,
    rotation: step.human.rotation,
    x: step.human.x,
    y: step.human.y,
  };
  let rank: number | null = null;
  let humanScore: number | null = null;
  for (let i = 0; i < result.candidates.length; i++) {
    const cand = result.candidates[i]!;
    if (samePlacement(cand.placement, human)) {
      rank = i + 1;
      humanScore = cand.score;
      break;
    }
  }
  if (humanScore === null && step.stateBefore.current) {
    const moves = generateMovesWithSpins(step.stateBefore.board, step.human.pieceType ?? step.stateBefore.current.type);
    const match = moves.find(
      (m) => m.placement.rotation === human.rotation && m.placement.x === human.x,
    );
    if (match) {
      const placed = placeAndClear(step.stateBefore.board, match.piece);
      humanScore = evaluateBoard(placed.board, placed.cleared, DEFAULT_WEIGHTS).score;
    }
  }
  return {
    placement: human,
    score: humanScore ?? Number.NEGATIVE_INFINITY,
    rank,
    inTop1: rank === 1,
    inTop3: rank !== null && rank <= 3,
    inTop5: rank !== null && rank <= 5,
    inTop10: rank !== null && rank <= 10,
    inCandidates: rank !== null,
    candidateCount: result.candidates.length,
    aiPlacement: result.move,
    aiScore: result.bestScore,
    humanScore,
  };
}

export function agreement(ranks: RankedChoice[]): AgreementStats {
  const compared = ranks.length;
  const top1 = ranks.filter((r) => r.inTop1).length;
  const top3 = ranks.filter((r) => r.inTop3).length;
  const top5 = ranks.filter((r) => r.inTop5).length;
  const top10 = ranks.filter((r) => r.inTop10).length;
  const outside = ranks.filter((r) => !r.inCandidates).length;
  const holdUsed = ranks.filter((r) => r.placement?.hold).length;
  const ranked = ranks.filter((r) => r.rank !== null);
  const avgRank =
    ranked.length === 0 ? 0 : ranked.reduce((sum, r) => sum + (r.rank ?? 0), 0) / ranked.length;
  const humans = ranks.filter((r) => r.humanScore !== null);
  return {
    compared,
    top1,
    top3,
    top5,
    top10,
    outside,
    holdUsed,
    avgRank,
    avgHumanScore:
      humans.length === 0 ? 0 : humans.reduce((sum, r) => sum + (r.humanScore ?? 0), 0) / humans.length,
    avgAiScore: compared === 0 ? 0 : ranks.reduce((sum, r) => sum + r.aiScore, 0) / compared,
  };
}
