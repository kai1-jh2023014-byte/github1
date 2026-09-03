import {
  CLEAR_LARGE,
  CLEAR_MEDIUM,
  CLEAR_SMALL,
  SETUP_LARGE,
  SETUP_MEDIUM,
  SETUP_SMALL,
  TSPIN_LARGE,
  TSPIN_MEDIUM,
  TSPIN_SMALL,
  type FutureWeights,
} from "../ai/future";
import { ADOPTED_SPEC, logProtocol, runProtocol, type ProtocolResult } from "./phase2";
import { formatSummary, runConfiguredBenchmark, type SearchSpec } from "./run";

export const PHASE3_FROZEN: SearchSpec = {
  ...ADOPTED_SPEC,
  name: "phase3-frozen-p2",
  futureSetup: false,
  tspinSetup: false,
  futureClear: false,
};

export function withSetup(base: SearchSpec, weights: FutureWeights): SearchSpec {
  const prev = base.futureWeights;
  return {
    ...base,
    name: "A-future-setup",
    futureSetup: true,
    futureWeights: {
      step1: weights.step1,
      step2: weights.step2,
      jagged: weights.jagged,
      tSlot: prev?.tSlot ?? 0,
      almost9: prev?.almost9 ?? 0,
      almost8: prev?.almost8 ?? 0,
    },
  };
}

export function withTspin(base: SearchSpec, weights: FutureWeights): SearchSpec {
  const prev = base.futureWeights;
  return {
    ...base,
    name: "B-tspin-setup",
    tspinSetup: true,
    futureWeights: {
      step1: prev?.step1 ?? 0,
      step2: prev?.step2 ?? 0,
      jagged: prev?.jagged ?? 0,
      tSlot: weights.tSlot,
      almost9: prev?.almost9 ?? 0,
      almost8: prev?.almost8 ?? 0,
    },
  };
}

export function withClear(base: SearchSpec, weights: FutureWeights): SearchSpec {
  const prev = base.futureWeights;
  return {
    ...base,
    name: "C-future-clear",
    futureClear: true,
    futureWeights: {
      step1: prev?.step1 ?? 0,
      step2: prev?.step2 ?? 0,
      jagged: prev?.jagged ?? 0,
      tSlot: prev?.tSlot ?? 0,
      almost9: weights.almost9,
      almost8: weights.almost8,
    },
  };
}

export const SETUP_WEIGHTS = { small: SETUP_SMALL, medium: SETUP_MEDIUM, large: SETUP_LARGE };
export const TSPIN_WEIGHTS = { small: TSPIN_SMALL, medium: TSPIN_MEDIUM, large: TSPIN_LARGE };
export const CLEAR_WEIGHTS = { small: CLEAR_SMALL, medium: CLEAR_MEDIUM, large: CLEAR_LARGE };

export function passesPhase3(
  candidate: ProtocolResult[],
  frozen: ProtocolResult[],
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const long = candidate.find((r) => r.protocol === "10x100");
  const baseLong = frozen.find((r) => r.protocol === "10x100");
  if (long && baseLong) {
    if (long.summary.averageLines + 1e-9 < baseLong.summary.averageLines) {
      reasons.push(`10x100 lines ${long.summary.averageLines.toFixed(2)} < ${baseLong.summary.averageLines.toFixed(2)}`);
    }
    if (long.summary.averageScore + 1e-9 < baseLong.summary.averageScore) {
      reasons.push(`10x100 score ${long.summary.averageScore.toFixed(1)} < ${baseLong.summary.averageScore.toFixed(1)}`);
    }
  }
  for (const row of candidate) {
    const base = frozen.find((f) => f.protocol === row.protocol);
    if (!base) continue;
    if (row.summary.gameOverRate > base.summary.gameOverRate + 1e-9) {
      reasons.push(`${row.protocol} gameOver worsened`);
    }
    if (row.summary.p95DecisionMs >= 50) {
      reasons.push(`${row.protocol} p95 ${row.summary.p95DecisionMs.toFixed(1)} >= 50`);
    }
    if (row.protocol !== "10x100" && row.summary.averageLines + 1e-9 < base.summary.averageLines) {
      reasons.push(`${row.protocol} lines regression ${row.summary.averageLines.toFixed(2)} < ${base.summary.averageLines.toFixed(2)}`);
    }
    if (row.protocol !== "10x100" && row.summary.averageScore + 1e-9 < base.summary.averageScore) {
      reasons.push(`${row.protocol} score regression ${row.summary.averageScore.toFixed(1)} < ${base.summary.averageScore.toFixed(1)}`);
    }
  }
  const improved =
    long &&
    baseLong &&
    (long.summary.averageLines > baseLong.summary.averageLines + 1e-9 ||
      long.summary.averageScore > baseLong.summary.averageScore + 1e-9);
  if (!improved) reasons.push("10x100 did not improve lines or score");
  return { pass: reasons.length === 0, reasons };
}

export function sweep5x40(
  base: SearchSpec,
  apply: (base: SearchSpec, w: FutureWeights) => SearchSpec,
  pack: Record<string, FutureWeights>,
): { name: string; lines: number; score: number; p95: number }[] {
  const rows: { name: string; lines: number; score: number; p95: number }[] = [];
  for (const [name, weights] of Object.entries(pack)) {
    const summary = runConfiguredBenchmark(
      [1, 2, 3, 4, 5],
      apply(base, weights),
      { maxPieces: 40, maxTicks: 4000 },
    );
    rows.push({
      name,
      lines: summary.averageLines,
      score: summary.averageScore,
      p95: summary.p95DecisionMs,
    });
    // eslint-disable-next-line no-console
    console.log(`PHASE3 sweep ${apply(base, weights).name} ${name}`, formatSummary(summary));
  }
  return rows;
}

export function pickSweepWinner(
  sweep: { name: string; lines: number; score: number; p95: number }[],
  baseline: { lines: number; score: number },
): string | null {
  const viable = sweep.filter(
    (row) => row.lines + 1e-9 >= baseline.lines && row.score + 1e-9 >= baseline.score && row.p95 < 50,
  );
  if (viable.length === 0) return null;
  viable.sort((a, b) => b.score - a.score || b.lines - a.lines);
  return viable[0]!.name;
}

export { runProtocol, logProtocol };
export type { ProtocolResult };
