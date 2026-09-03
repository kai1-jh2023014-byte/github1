import { describe, expect, it } from "vitest";
import { DEFAULT_MECHANICS } from "../ai/weights";
import { formatSummary, runBenchmark, runConfiguredBenchmark } from "./run";

describe("AI benchmark", () => {
  it("runs a reproducible 1-ply vs 2-ply comparison", () => {
    const seeds = [1, 2, 3, 4, 5];
    const one = runBenchmark(seeds, 1, { maxPieces: 40, maxTicks: 2500 });
    const two = runBenchmark(seeds, 2, { maxPieces: 40, maxTicks: 2500 });

    expect(one.games).toBe(5);
    expect(two.games).toBe(5);
    expect(one.averageLines).toBeGreaterThan(0);
    expect(two.averageLines).toBeGreaterThan(0);
    expect(one.averageDecisionMs).toBeGreaterThan(0);
    expect(two.averageDecisionMs).toBeGreaterThanOrEqual(one.averageDecisionMs * 0.5);

    // eslint-disable-next-line no-console
    console.log("BENCH 1-ply", formatSummary(one));
    // eslint-disable-next-line no-console
    console.log("BENCH 2-ply", formatSummary(two));
    expect(two.averageHolds).toBe(0);
    expect(two.p50DecisionMs).toBeGreaterThanOrEqual(0);
    expect(two.p95DecisionMs).toBeGreaterThanOrEqual(two.p50DecisionMs);
  });

  it("final beam 3x12 beats or matches 2-ply on the same 5x40 protocol", () => {
    const seeds = [1, 2, 3, 4, 5];
    const two = runBenchmark(seeds, 2, { maxPieces: 40, maxTicks: 2500 });
    const beam = runConfiguredBenchmark(
      seeds,
      {
        name: "beam-3x12",
        algorithm: "beam",
        depth: 3,
        beamWidth: 12,
        useHold: false,
        mechanicsWeights: DEFAULT_MECHANICS,
      },
      { maxPieces: 40, maxTicks: 2500 },
    );
    // eslint-disable-next-line no-console
    console.log("BENCH 2-ply gate", formatSummary(two));
    // eslint-disable-next-line no-console
    console.log("BENCH beam-3x12", formatSummary(beam));
    expect(beam.averageLines).toBeGreaterThanOrEqual(two.averageLines);
    expect(beam.gameOverRate).toBeLessThanOrEqual(two.gameOverRate);
    expect(beam.p95DecisionMs).toBeLessThan(80);
  });
});
