import { describe, expect, it } from "vitest";
import { formatSummary, runBenchmark } from "./run";

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
  });
});
