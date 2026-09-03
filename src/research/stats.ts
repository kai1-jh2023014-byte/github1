import { scoreFeatures } from "../ai/evaluator";
import { DEFAULT_WEIGHTS } from "../ai/weights";
import { tSpinReadyCount } from "./shape";
import type { BehaviorStats, DecisionGap, ReplayStep } from "./types";

export function behaviorStats(steps: ReplayStep[], gaps: DecisionGap[]): BehaviorStats {
  const n = Math.max(1, steps.length);
  const disagree = gaps.filter((g) => g.category !== "agree");
  const d = Math.max(1, disagree.length);
  let hold = 0;
  let tSetup = 0;
  let b2bKeep = 0;
  let b2bLive = 0;
  let renKeep = 0;
  let renLive = 0;
  let humanBetter = 0;
  for (const step of steps) {
    if (step.human.hold) hold += 1;
    if (tSpinReadyCount(step.stateAfter.board).full > 0) tSetup += 1;
    if (step.stateBefore.backToBack) {
      b2bLive += 1;
      if (step.stateAfter.backToBack) b2bKeep += 1;
    }
    if (step.stateBefore.combo >= 1) {
      renLive += 1;
      if (step.human.linesCleared > 0) renKeep += 1;
    }
  }
  for (const gap of disagree) {
    if (!gap.aiFeatures) continue;
    const hs = scoreFeatures(gap.humanFeatures, DEFAULT_WEIGHTS);
    const as = scoreFeatures(gap.aiFeatures, DEFAULT_WEIGHTS);
    if (hs > as) humanBetter += 1;
  }
  const share = (cat: DecisionGap["category"]) =>
    disagree.filter((g) => g.category === cat).length / d;
  return {
    holdRate: hold / n,
    tSpinSetupRate: tSetup / n,
    b2bPreserveRate: b2bLive === 0 ? 0 : b2bKeep / b2bLive,
    renPreserveRate: renLive === 0 ? 0 : renKeep / renLive,
    downstackShare: share("downstack"),
    iWellShare: share("i_well"),
    futureSetupShare: share("future_setup"),
    humanImmediateBetter: humanBetter,
    humanImmediateBetterRate: humanBetter / d,
  };
}
