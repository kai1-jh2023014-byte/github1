import { DEFAULT_MECHANICS } from "../ai/weights";
import type { SearchSpec } from "./run";
import { formatSummary, runConfiguredBenchmark, type BenchmarkSummary } from "./run";

export const SEEDS40 = [1, 2, 3, 4, 5];
export const SEEDS100_5 = [1, 2, 3, 4, 5];
export const SEEDS100_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const SHORT = { maxPieces: 40, maxTicks: 4000 };
export const LONG = { maxPieces: 100, maxTicks: 10000 };

export const FROZEN_SPEC: SearchSpec = {
  name: "A-frozen-3x12",
  algorithm: "beam",
  depth: 3,
  beamWidth: 12,
  useHold: false,
  useGatedHold: false,
  wellReservation: false,
  surfaceOverhang: false,
  mechanicsWeights: DEFAULT_MECHANICS,
};

export const ADOPTED_SPEC: SearchSpec = {
  name: "adopted-gated-hold-well",
  algorithm: "beam",
  depth: 3,
  beamWidth: 12,
  useHold: false,
  useGatedHold: true,
  wellReservation: true,
  surfaceOverhang: false,
  mechanicsWeights: DEFAULT_MECHANICS,
};

export function gatedHoldSpec(base: SearchSpec = FROZEN_SPEC): SearchSpec {
  return { ...base, name: "B-gated-hold", useGatedHold: true, useHold: false };
}

export function wellSpec(base: SearchSpec): SearchSpec {
  return { ...base, name: "C-well-i", wellReservation: true };
}

export function surfaceSpec(base: SearchSpec): SearchSpec {
  return { ...base, name: "D-surface", surfaceOverhang: true };
}

export interface ProtocolResult {
  protocol: string;
  summary: BenchmarkSummary;
}

export function runProtocol(spec: SearchSpec): ProtocolResult[] {
  return [
    { protocol: "5x40", summary: runConfiguredBenchmark(SEEDS40, spec, SHORT) },
    { protocol: "5x100", summary: runConfiguredBenchmark(SEEDS100_5, spec, LONG) },
    { protocol: "10x100", summary: runConfiguredBenchmark(SEEDS100_10, spec, LONG) },
  ];
}

export function passesVsFrozen(
  candidate: ProtocolResult[],
  frozen: ProtocolResult[],
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const row of candidate) {
    const base = frozen.find((f) => f.protocol === row.protocol);
    if (!base) continue;
    if (row.summary.averageLines + 1e-9 < base.summary.averageLines) {
      reasons.push(`${row.protocol} lines ${row.summary.averageLines.toFixed(2)} < ${base.summary.averageLines.toFixed(2)}`);
    }
    if (row.summary.averageScore + 1e-9 < base.summary.averageScore) {
      reasons.push(`${row.protocol} score ${row.summary.averageScore.toFixed(1)} < ${base.summary.averageScore.toFixed(1)}`);
    }
    if (row.summary.gameOverRate > base.summary.gameOverRate + 1e-9) {
      reasons.push(`${row.protocol} gameOver ${row.summary.gameOverRate} > ${base.summary.gameOverRate}`);
    }
    if (row.summary.p95DecisionMs > 80) {
      reasons.push(`${row.protocol} p95 ${row.summary.p95DecisionMs.toFixed(1)}ms > 80`);
    }
  }
  const improved = candidate.some((row) => {
    const base = frozen.find((f) => f.protocol === row.protocol);
    if (!base) return false;
    return (
      row.summary.averageLines > base.summary.averageLines + 1e-9 ||
      row.summary.averageScore > base.summary.averageScore + 1e-9
    );
  });
  if (!improved) reasons.push("no lines/score improvement on any protocol");
  return { pass: reasons.length === 0, reasons };
}

export function logProtocol(label: string, rows: ProtocolResult[]): void {
  for (const row of rows) {
    // eslint-disable-next-line no-console
    console.log(`PHASE2 ${label} ${row.protocol}`, formatSummary(row.summary));
  }
}
