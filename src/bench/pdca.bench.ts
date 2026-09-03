import { describe, expect, it } from "vitest";
import { DEFAULT_MECHANICS, ZERO_MECHANICS } from "../ai/weights";
import {
  formatSummary,
  plySpec,
  runConfiguredBenchmark,
  type SearchSpec,
} from "./run";

const SEEDS = [1, 2, 3, 4, 5];
const SHORT = { maxPieces: 40, maxTicks: 4000 };

function beamSpec(
  name: string,
  depth: number,
  beamWidth: number,
  extras: Partial<SearchSpec> = {},
): SearchSpec {
  return {
    name,
    algorithm: "beam",
    depth,
    beamWidth,
    useHold: extras.useHold ?? true,
    mechanicsWeights: extras.mechanicsWeights ?? DEFAULT_MECHANICS,
  };
}

describe("PDCA search comparison", () => {
  it(
    "compares 2-ply baseline against beam configs on the same seeds",
    () => {
      const baseline = runConfiguredBenchmark(SEEDS, plySpec(2), SHORT);
      const configs: SearchSpec[] = [
        beamSpec("beam-2x8-hold-mech", 2, 8),
        beamSpec("beam-3x8-hold-mech", 3, 8),
        beamSpec("beam-3x12-hold-mech", 3, 12),
        beamSpec("beam-3x16-hold-mech", 3, 16),
        beamSpec("beam-4x16-hold-mech", 4, 16),
        beamSpec("beam-only-3x12", 3, 12, {
          useHold: false,
          mechanicsWeights: ZERO_MECHANICS,
        }),
        beamSpec("beam-hold-3x12", 3, 12, {
          useHold: true,
          mechanicsWeights: ZERO_MECHANICS,
        }),
      ];

      // eslint-disable-next-line no-console
      console.log("PDCA BASELINE", formatSummary(baseline));
      const summaries = configs.map((spec) => {
        const summary = runConfiguredBenchmark(SEEDS, spec, SHORT);
        // eslint-disable-next-line no-console
        console.log("PDCA", formatSummary(summary));
        return summary;
      });

      expect(baseline.games).toBe(5);
      expect(summaries.every((s) => s.games === 5)).toBe(true);
      expect(baseline.averageLines).toBeGreaterThan(0);
    },
    180_000,
  );
});
