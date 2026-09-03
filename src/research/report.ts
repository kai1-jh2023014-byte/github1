import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AgreementStats, BehaviorStats, DatasetStats, DecisionGap, GapCategory } from "./types";

const CATEGORIES: GapCategory[] = [
  "immediate_line_clear",
  "future_setup",
  "tspin_setup",
  "b2b",
  "ren",
  "downstack",
  "i_well",
  "hold",
  "board_shape",
  "search_horizon",
  "unknown",
  "agree",
];

export interface AnalysisResult {
  dataset: DatasetStats;
  agreement: AgreementStats;
  behavior: BehaviorStats;
  gaps: DecisionGap[];
  examples: DecisionGap[];
  hypotheses: Hypothesis[];
}

export interface Hypothesis {
  rank: number;
  observed: string;
  cause: string;
  improvement: string;
  effect: string;
  benchmark: string;
}

export function writeReport(path: string, analysis: AnalysisResult): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderMarkdown(analysis));
}

export function renderMarkdown(a: AnalysisResult): string {
  const n = a.agreement.compared || 1;
  const gapCounts = countGaps(a.gaps);
  const disagree = a.gaps.filter((g) => g.category !== "agree");
  return `# Expert Replay Analysis — Phase 1

This report compares a guideline-style expert policy (and any ingested video) against the **frozen** live baseline:

\`\`\`
Search = BeamSearch
Depth = 3
BeamWidth = 12
Hold search = OFF
T-spin / REN / B2B eval = ON
DEFAULT_WEIGHTS unchanged
\`\`\`

Human imitation learning was **not** used. Disagreements are decision gaps, not automatic proof that the human/expert move is stronger.

## Dataset

| Item | Value |
|---|---|
| Source | ${a.dataset.source} |
| Duration (s) | ${a.dataset.durationSec.toFixed(2)} |
| Frames | ${a.dataset.frames} |
| Valid GameStates | ${a.dataset.validStates} |
| Valid Actions | ${a.dataset.validActions} |
| Missing / low-confidence rate | ${a.dataset.missingRate.toFixed(3)} |
| Conf board | ${a.dataset.meanConfidence.board.toFixed(3)} |
| Conf current | ${a.dataset.meanConfidence.current.toFixed(3)} |
| Conf next | ${a.dataset.meanConfidence.next.toFixed(3)} |
| Conf hold | ${a.dataset.meanConfidence.hold.toFixed(3)} |
| Conf action | ${a.dataset.meanConfidence.action.toFixed(3)} |

Source video files were not present in the workspace at analysis time. The pipeline can ingest \`mp4\` via ffmpeg. The numbers below come from a **labeled guideline-expert fixture** recorded through our renderer (high-confidence ground truth) plus a video round-trip check.

## Human vs AI (frozen Beam 3×12)

| Metric | Value |
|---|---|
| Compared placements | ${a.agreement.compared} |
| Top-1 agreement | ${pct(a.agreement.top1, n)} |
| Top-3 | ${pct(a.agreement.top3, n)} |
| Top-5 | ${pct(a.agreement.top5, n)} |
| Top-10 | ${pct(a.agreement.top10, n)} |
| Outside AI candidates | ${pct(a.agreement.outside, n)} |
| Hold used by expert | ${a.agreement.holdUsed} |
| Average human rank (when in list) | ${a.agreement.avgRank.toFixed(2)} |
| Avg AI score of Beam choice | ${a.agreement.avgAiScore.toFixed(3)} |
| Avg AI score of expert choice | ${a.agreement.avgHumanScore.toFixed(3)} |

Immediate 1-ply board eval (not Beam leaf score) is a different number from the search score. When they diverge, the evaluator — not only depth — is in play.

## Expert behavior vs Beam (derived, not imitation labels)

| Metric | Value |
|---|---|
| Hold use rate | ${(a.behavior.holdRate * 100).toFixed(1)}% |
| Boards with a T-spin-ready slot after the expert move | ${(a.behavior.tSpinSetupRate * 100).toFixed(1)}% |
| B2B kept when B2B was live | ${(a.behavior.b2bPreserveRate * 100).toFixed(1)}% |
| REN continued when combo ≥ 1 | ${(a.behavior.renPreserveRate * 100).toFixed(1)}% |
| Disagreements labeled downstack | ${(a.behavior.downstackShare * 100).toFixed(1)}% |
| Disagreements labeled I-well | ${(a.behavior.iWellShare * 100).toFixed(1)}% |
| Disagreements labeled future setup | ${(a.behavior.futureSetupShare * 100).toFixed(1)}% |
| Disagreements where expert 1-ply eval > Beam's first-ply board | ${a.behavior.humanImmediateBetter} (${(a.behavior.humanImmediateBetterRate * 100).toFixed(1)}%) |

## Decision Gap

Disagreements only (${disagree.length} / ${a.gaps.length}).

| Category | Count | Share of disagreements |
|---|---:|---:|
${CATEGORIES.filter((c) => c !== "agree")
    .map((c) => {
      const count = gapCounts[c] ?? 0;
      const share = disagree.length ? count / disagree.length : 0;
      return `| ${c} | ${count} | ${(share * 100).toFixed(1)}% |`;
    })
    .join("\n")}

## Important Examples

${a.examples
    .map(
      (ex, i) => `### Example ${i + 1} — ${ex.category}

- Timestamp / piece index: ${ex.step.timestamp}
- Current: \`${ex.step.stateBefore.current?.type ?? "?"}\`  Hold: \`${ex.step.stateBefore.holdPiece ?? "empty"}\`  canHold: ${ex.step.stateBefore.canHold}
- Combo / B2B before: ${ex.step.stateBefore.combo} / ${ex.step.stateBefore.backToBack}
- Human: spawn=${ex.step.human.spawn} hold=${ex.step.human.hold} rot=${ex.step.human.rotation} x=${ex.step.human.x} y=${ex.step.human.y} hardDrop=${ex.step.human.hardDrop} clears=${ex.step.human.linesCleared} tspin=${ex.step.human.tSpin} comboAfter=${ex.step.human.comboAfter} b2bAfter=${ex.step.human.b2bAfter}
- AI: hold=${ex.ranked.aiPlacement?.hold ?? false} rot=${ex.ranked.aiPlacement?.rotation ?? "—"} x=${ex.ranked.aiPlacement?.x ?? "—"}
- Human rank in Beam list: ${ex.ranked.rank ?? "outside"}
- Beam score (AI choice / human choice): ${ex.ranked.aiScore.toFixed(3)} / ${ex.ranked.humanScore?.toFixed(3) ?? "n/a"}
- Human holes/height/well-relevant maxHeight: ${ex.humanFeatures.holes} / ${ex.humanFeatures.aggregateHeight} / ${ex.humanFeatures.maxHeight}
- Why they differ: ${ex.reason}
- Likely missing feature: ${ex.missingFeature}
- Classification confidence: ${ex.confidence.toFixed(2)}
- Reconstruction confidence (board/action): ${ex.step.confidence.board.toFixed(2)} / ${ex.step.confidence.action.toFixed(2)}
`,
    )
    .join("\n")}

## Hypotheses (priority order)

Do **not** copy expert moves as labels. Each hypothesis must be A/B tested against frozen Beam 3×12.

${a.hypotheses
    .map(
      (h) => `### Hypothesis #${h.rank}

\`\`\`
Observed Pattern
${h.observed}
        ↓
Likely Cause
${h.cause}
        ↓
Candidate Improvement
${h.improvement}
        ↓
Expected Effect
${h.effect}
        ↓
How to Benchmark
${h.benchmark}
\`\`\`
`,
    )
    .join("\n")}

## Notes

- Frozen Beam hold-off means every expert Hold is *outside candidates* by construction. That is a search-policy gap, not a ranking bug.
- T-spin / REN / B2B **state** exists in Core; the evaluator only rewards completed spins and current combo/B2B flags, not setups.
- Phase 1 does not change live weights or search settings.
`;
}

export function buildHypotheses(gaps: DecisionGap[], agreement: AgreementStats): Hypothesis[] {
  const disagree = gaps.filter((g) => g.category !== "agree");
  const counts = countGaps(disagree);
  const n = Math.max(1, disagree.length);
  const ranked = (CATEGORIES.filter((c) => c !== "agree") as GapCategory[])
    .map((c) => ({ c, n: counts[c] ?? 0 }))
    .sort((a, b) => b.n - a.n);

  const catalog: Record<GapCategory, Hypothesis> = {
    i_well: {
      rank: 0,
      observed: `Expert preserves a 1-wide well in ${(100 * (counts.i_well ?? 0) / n).toFixed(0)}% of disagreements.`,
      cause: "Current evaluator treats wells as a penalty and linesCleared as a large bonus, so Beam fills the well for a single.",
      improvement: "Add a tetris-well feature (deep 1-wide column next to high walls) and a penalty for filling it with a non-I piece.",
      effect: "Fewer well-kills, more 4-line clears later; Hold-I becomes useful instead of harmful.",
      benchmark: "Same 5×40 and 10×100 seeds vs frozen Beam 3×12. Watch tetrises, lines, and well-fill rate.",
    },
    hold: {
      rank: 0,
      observed: `Expert Hold appears in ${agreement.holdUsed} placements; frozen Beam never holds.`,
      cause: "Hold search is default-off because equal-weight Hold over-held and lost lines.",
      improvement: "Keep Hold off as an equal candidate. Add a gated Hold: only when current is I and no tetris, or hold is I and a well is ready.",
      effect: "I-save without the 12-holds-per-40-piece collapse.",
      benchmark: "A/B Hold-gated vs frozen hold-off on the same seeds; require lines not to regress.",
    },
    tspin_setup: {
      rank: 0,
      observed: "Expert boards more often keep T-spin-ready cavities that Beam does not create.",
      cause: "mechanicsScore rewards completed T-spins only. generateMovesWithSpins finds lock spins, not future T-slots.",
      improvement: "Add tSpinReadyCount(board) as a small additive feature; do not outweigh holes.",
      effect: "Occasional TSD / B2B instead of flattening every T-cavity.",
      benchmark: "Count tSpinReady after 40 pieces; t-spin and B2B stats; lines must not fall below frozen.",
    },
    immediate_line_clear: {
      rank: 0,
      observed: "Beam often takes an immediate line that the expert skips.",
      cause: "linesCleared weight 0.76 dominates structure on the first ply.",
      improvement: "Reduce immediate 1-line reward when maxHeight is low, or require the clear to improve holes/well.",
      effect: "Less greedy singles, better mid-game shape.",
      benchmark: "Lines + score on 10×100; distribution of 1 vs 4 line clears.",
    },
    future_setup: {
      rank: 0,
      observed: "Expert moves sit in Beam's list but below top-10 — the search sees them, the eval ranks them away.",
      cause: "Leaf eval is almost the same board heuristic as 2-ply; depth 3 cannot invent setup value that the leaf does not score.",
      improvement: "Put setup features in the leaf (well, T-slot, I-hold), not more depth.",
      effect: "Depth 3 starts preferring the same setups the expert keeps.",
      benchmark: "Human/expert rank of well-preserving moves should rise; frozen 3×12 A/B.",
    },
    search_horizon: {
      rank: 0,
      observed: "Some expert placements are outside the candidate set.",
      cause: "Hold-off plus spin pruning plus root ranking still miss some kick/hold paths.",
      improvement: "After setup features exist, re-enable Hold only as a gated root branch; keep root-complete first ply.",
      effect: "Candidate coverage of expert I-saves without exploding latency.",
      benchmark: "outside-candidate rate vs frozen; p95 latency < 80 ms.",
    },
    b2b: {
      rank: 0,
      observed: "Expert skips dirty clears while backToBack is live.",
      cause: "B2B is a 0/1 flag after a qualifying clear, not a reason to refuse a single.",
      improvement: "Penalize non-qualifying clears when backToBack is true and a well/T-slot exists.",
      effect: "Longer B2B chains if tetrises/TSDs are actually reachable.",
      benchmark: "b2bClears on 10×100 vs frozen.",
    },
    ren: {
      rank: 0,
      observed: "Expert continues a combo when Beam drops a no-clear placement.",
      cause: "combo weight is small and only applied after the fact.",
      improvement: "Add a next-clear-likelihood term when combo >= 1 (almost-full rows).",
      effect: "Short REN chains in downstack, not endless combo hunting.",
      benchmark: "maxCombo and lines; reject if holes explode.",
    },
    downstack: {
      rank: 0,
      observed: "On tall stacks the expert dumps height; Beam still shapes for later.",
      cause: "maxHeight penalty is modest vs linesCleared.",
      improvement: "Piecewise maxHeight: extra penalty above 12.",
      effect: "Fewer deaths if garbage is added later; maybe fewer lines in sprint.",
      benchmark: "gameOverRate on 200-piece games; 40-piece lines must not collapse.",
    },
    board_shape: {
      rank: 0,
      observed: "Expert surfaces are flatter / less holed than Beam's choice on disagreements.",
      cause: "bumpiness is adjacent-column only; overhangs and 2-wide trenches are weak.",
      improvement: "Add overhang / covered-hole and 2-wide trench features.",
      effect: "Cleaner stacks independent of T-spin.",
      benchmark: "holes and bumpiness after 40 pieces vs frozen.",
    },
    unknown: {
      rank: 0,
      observed: "A slice of disagreements has no clean mechanic label.",
      cause: "Mixed motives or reconstruction noise.",
      improvement: "Keep them unlabeled; do not fit weights to them.",
      effect: "Avoid overfitting.",
      benchmark: "Manual review sample, not an automatic win.",
    },
    agree: {
      rank: 0,
      observed: "",
      cause: "",
      improvement: "",
      effect: "",
      benchmark: "",
    },
  };

  const picked: Hypothesis[] = [];
  for (const row of ranked) {
    if (row.n === 0 && row.c !== "hold") continue;
    const h = catalog[row.c];
    if (!h.observed) continue;
    picked.push({ ...h, rank: picked.length + 1 });
    if (picked.length >= 10) break;
  }
  return picked;
}

function countGaps(gaps: DecisionGap[]): Partial<Record<GapCategory, number>> {
  const out: Partial<Record<GapCategory, number>> = {};
  for (const gap of gaps) out[gap.category] = (out[gap.category] ?? 0) + 1;
  return out;
}

function pct(part: number, whole: number): string {
  return `${part} / ${whole} (${((part / whole) * 100).toFixed(1)}%)`;
}
