import { computeFeatures } from "../ai/evaluator";
import { generateMovesWithSpins } from "../ai/moveGenerator";
import { placeAndClear } from "../game/lineClear";
import { samePlacement } from "./state";
import { deepestWell, filledWellColumn, tSpinReadyCount } from "./shape";
import type { DecisionGap, GapCategory, RankedChoice, ReplayStep } from "./types";
import type { EvalFeatures, Placement } from "../ai/types";

export function classifyGap(step: ReplayStep, ranked: RankedChoice): DecisionGap {
  const humanFeatures = computeFeatures(step.stateAfter.board, step.human.linesCleared);
  const beforeFeatures = computeFeatures(step.stateBefore.board, 0);
  const aiBoard = aiAfterFeatures(step, ranked.aiPlacement);
  if (ranked.inTop1) {
    return make(step, ranked, "agree", "Human matched Beam 3×12 top choice.", "none", 0.95, humanFeatures, aiBoard.features);
  }

  const wellBefore = deepestWell(step.stateBefore.board);
  const wellAfterH = deepestWell(step.stateAfter.board);
  const wellAfterA = aiBoard.board ? deepestWell(aiBoard.board) : wellAfterH;
  const tBefore = tSpinReadyCount(step.stateBefore.board);
  const tAfterH = tSpinReadyCount(step.stateAfter.board);
  const tAfterA = aiBoard.board ? tSpinReadyCount(aiBoard.board) : tAfterH;
  const humanClears = step.human.linesCleared;
  const aiClears = aiBoard.cleared;
  const heightBefore = beforeFeatures.maxHeight;
  const reasons: { cat: GapCategory; why: string; missing: string; conf: number }[] = [];

  if (step.human.hold !== Boolean(ranked.aiPlacement?.hold)) {
    reasons.push({
      cat: "hold",
      why: step.human.hold
        ? "Human held; frozen Beam has hold search off so it never matches this branch."
        : "Human placed the current piece while Beam would have used a different column/rotation, not a hold.",
      missing: "Hold as a first-class search decision with a well/I-save prior, not an equal-weight branch.",
      conf: 0.86,
    });
  }

  if (aiClears > humanClears && humanClears === 0) {
    reasons.push({
      cat: "immediate_line_clear",
      why: `Beam clears ${aiClears} now; human cleared 0.`,
      missing: "Down-weight immediate singles relative to structure.",
      conf: 0.8,
    });
  }

  if (wellBefore.depth >= 3 && filledWellColumn(step.stateBefore.board, step.stateAfter.board, wellBefore) === false) {
    const aiFilled =
      aiBoard.board !== null && filledWellColumn(step.stateBefore.board, aiBoard.board, wellBefore);
    if (aiFilled || wellAfterH.depth > wellAfterA.depth) {
      reasons.push({
        cat: "i_well",
        why: `Human kept a depth-${wellAfterH.depth} well (col ${wellAfterH.col}); Beam did not.`,
        missing: "Tetris-well / I-piece reservation feature.",
        conf: 0.78,
      });
    }
  }

  if (tAfterH.full > tAfterA.full || (tAfterH.full > tBefore.full && tAfterA.full <= tBefore.full)) {
    reasons.push({
      cat: "tspin_setup",
      why: `Human T-spin-ready slots ${tAfterH.full} vs Beam ${tAfterA.full} (before ${tBefore.full}).`,
      missing: "T-spin setup potential, not only completed T-spins.",
      conf: 0.76,
    });
  }

  if (step.stateBefore.backToBack && humanClears === 0 && aiClears > 0 && aiClears < 4) {
    reasons.push({
      cat: "b2b",
      why: "Human skipped a non-qualifying clear while B2B was live.",
      missing: "B2B as future attack value, not only a post-clear flag.",
      conf: 0.7,
    });
  }

  if (step.stateBefore.combo >= 1 && humanClears > 0 && aiClears === 0) {
    reasons.push({
      cat: "ren",
      why: `Human continued REN (combo ${step.stateBefore.combo} → ${step.stateAfter.combo}).`,
      missing: "Combo continuation / next-clear likelihood.",
      conf: 0.68,
    });
  }

  if (heightBefore >= 10 && humanFeatures.maxHeight + 1 < (aiBoard.features?.maxHeight ?? heightBefore)) {
    reasons.push({
      cat: "downstack",
      why: "Human reduced stack height more than Beam on a tall board.",
      missing: "Danger / downstack term that dominates when maxHeight is high.",
      conf: 0.66,
    });
  }

  if (humanFeatures.holes + 1 < (aiBoard.features?.holes ?? humanFeatures.holes) ||
      humanFeatures.bumpiness + 2 < (aiBoard.features?.bumpiness ?? humanFeatures.bumpiness)) {
    reasons.push({
      cat: "board_shape",
      why: "Human board is flatter or has fewer holes than Beam's choice.",
      missing: "Surface / hole-shape features beyond current bumpiness.",
      conf: 0.6,
    });
  }

  if (!ranked.inCandidates) {
    reasons.push({
      cat: "search_horizon",
      why: "Human placement is outside Beam's candidate list (hold-off or spin/horizon).",
      missing: "Root hold-on-demand, or deeper/wider beam for setup moves.",
      conf: 0.55,
    });
  } else if (ranked.rank !== null && ranked.rank > 10) {
    reasons.push({
      cat: "future_setup",
      why: `Human rank ${ranked.rank} — Beam sees the move but ranks it low.`,
      missing: "Long-horizon setup value in the evaluator.",
      conf: 0.58,
    });
  }

  reasons.sort((a, b) => b.conf - a.conf);
  const picked = reasons[0] ?? {
    cat: "unknown" as GapCategory,
    why: "Not enough structure to label this disagreement.",
    missing: "Needs manual review.",
    conf: 0.35,
  };

  return make(step, ranked, picked.cat, picked.why, picked.missing, picked.conf, humanFeatures, aiBoard.features);
}

function aiAfterFeatures(
  step: ReplayStep,
  ai: Placement | null,
): { board: ReplayStep["stateAfter"]["board"] | null; cleared: number; features: EvalFeatures | null } {
  if (!ai || !step.stateBefore.current) {
    return { board: null, cleared: 0, features: null };
  }
  const type = step.stateBefore.current.type;
  const moves = generateMovesWithSpins(step.stateBefore.board, type);
  const match = moves.find((m) => samePlacement(m.placement, ai));
  if (!match) return { board: null, cleared: 0, features: null };
  const placed = placeAndClear(step.stateBefore.board, match.piece);
  return {
    board: placed.board,
    cleared: placed.cleared,
    features: computeFeatures(placed.board, placed.cleared),
  };
}

function make(
  step: ReplayStep,
  ranked: RankedChoice,
  category: GapCategory,
  reason: string,
  missingFeature: string,
  confidence: number,
  humanFeatures: EvalFeatures,
  aiFeatures: EvalFeatures | null,
): DecisionGap {
  return {
    step,
    ranked,
    category,
    reason,
    missingFeature,
    confidence,
    humanFeatures,
    aiFeatures,
  };
}
