import {
  HOLE_LARGE,
  HOLE_MEDIUM,
  HOLE_SMALL,
  SURFACE_LARGE,
  SURFACE_MEDIUM,
  SURFACE_SMALL,
  WELL_LARGE,
  WELL_MEDIUM,
  WELL_SMALL,
  summarizeDelta,
  type DeltaDist,
  type DeltaWeights,
} from "../ai/delta";
import { ADOPTED_SPEC, logProtocol, runProtocol, type ProtocolResult } from "./phase2";
import { formatSummary, runConfiguredBenchmark, type SearchSpec } from "./run";

export const PHASE4_FROZEN: SearchSpec = {
  ...ADOPTED_SPEC,
  name: "phase4-frozen-p3",
  futureSetup: false,
  tspinSetup: false,
  futureClear: false,
  wellDelta: false,
  holeDelta: false,
  surfaceDelta: false,
};

export function withWellDelta(base: SearchSpec, weights: DeltaWeights): SearchSpec {
  return {
    ...base,
    name: "A-well-delta",
    wellDelta: true,
    deltaWeights: {
      wellDestroy: weights.wellDestroy,
      wellCreate: weights.wellCreate,
      holeCreate: base.deltaWeights?.holeCreate ?? 0,
      holeFill: base.deltaWeights?.holeFill ?? 0,
      surfaceDamage: base.deltaWeights?.surfaceDamage ?? 0,
    },
  };
}

export function withHoleDelta(base: SearchSpec, weights: DeltaWeights): SearchSpec {
  return {
    ...base,
    name: "B-hole-delta",
    holeDelta: true,
    deltaWeights: {
      wellDestroy: base.deltaWeights?.wellDestroy ?? 0,
      wellCreate: base.deltaWeights?.wellCreate ?? 0,
      holeCreate: weights.holeCreate,
      holeFill: weights.holeFill,
      surfaceDamage: base.deltaWeights?.surfaceDamage ?? 0,
    },
  };
}

export function withSurfaceDelta(base: SearchSpec, weights: DeltaWeights): SearchSpec {
  return {
    ...base,
    name: "C-surface-delta",
    surfaceDelta: true,
    deltaWeights: {
      wellDestroy: base.deltaWeights?.wellDestroy ?? 0,
      wellCreate: base.deltaWeights?.wellCreate ?? 0,
      holeCreate: base.deltaWeights?.holeCreate ?? 0,
      holeFill: base.deltaWeights?.holeFill ?? 0,
      surfaceDamage: weights.surfaceDamage,
    },
  };
}

export const WELL_WEIGHTS = { small: WELL_SMALL, medium: WELL_MEDIUM, large: WELL_LARGE };
export const HOLE_WEIGHTS = { small: HOLE_SMALL, medium: HOLE_MEDIUM, large: HOLE_LARGE };
export const SURFACE_WEIGHTS = { small: SURFACE_SMALL, medium: SURFACE_MEDIUM, large: SURFACE_LARGE };

export function passesPhase4(
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
    if (row.summary.p95DecisionMs >= 45) {
      reasons.push(`${row.protocol} p95 ${row.summary.p95DecisionMs.toFixed(1)} >= 45`);
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
  apply: (base: SearchSpec, w: DeltaWeights) => SearchSpec,
  pack: Record<string, DeltaWeights>,
): { name: string; lines: number; score: number; p95: number }[] {
  const rows: { name: string; lines: number; score: number; p95: number }[] = [];
  for (const [name, weights] of Object.entries(pack)) {
    const spec = apply(base, weights);
    const summary = runConfiguredBenchmark([1, 2, 3, 4, 5], spec, { maxPieces: 40, maxTicks: 4000 });
    rows.push({
      name,
      lines: summary.averageLines,
      score: summary.averageScore,
      p95: summary.p95DecisionMs,
    });
    // eslint-disable-next-line no-console
    console.log(`PHASE4 sweep ${spec.name} ${name}`, formatSummary(summary));
    logDelta("well", summary.deltaWell);
    logDelta("hole", summary.deltaHole);
    logDelta("surface", summary.deltaSurface);
  }
  return rows;
}

export function pickSweepWinner(
  sweep: { name: string; lines: number; score: number; p95: number }[],
  baseline: { lines: number; score: number },
): string | null {
  const viable = sweep.filter(
    (row) => row.lines + 1e-9 >= baseline.lines && row.score + 1e-9 >= baseline.score && row.p95 < 45,
  );
  if (viable.length === 0) return null;
  viable.sort((a, b) => b.score - a.score || b.lines - a.lines);
  return viable[0]!.name;
}

export function logDelta(label: string, dist: DeltaDist): void {
  const s = summarizeDelta(dist);
  if (s.n === 0) return;
  // eslint-disable-next-line no-console
  console.log(
    `PHASE4 delta ${label} n=${s.n} mean=${s.mean.toFixed(4)} median=${s.median.toFixed(4)} p95=${s.p95.toFixed(4)} pos=${s.pos} neg=${s.neg} zero=${s.zero} active=${(s.activeShare * 100).toFixed(1)}%`,
  );
}

export { runProtocol, logProtocol };
export type { ProtocolResult };
