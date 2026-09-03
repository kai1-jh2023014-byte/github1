import { describe, expect, it } from "vitest";
import { DEFAULT_MECHANICS, ZERO_MECHANICS } from "../ai/weights";
import { formatSummary, plySpec, runConfiguredBenchmark, type SearchSpec } from "./run";

const SEEDS40 = [1, 2, 3, 4, 5];
const SEEDS100 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SHORT = { maxPieces: 40, maxTicks: 4000 };
const LONG = { maxPieces: 100, maxTicks: 10000 };

const PDCA =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PDCA ===
  "1";

const FINAL: SearchSpec = {
  name: "beam-3x12-mech",
  algorithm: "beam",
  depth: 3,
  beamWidth: 12,
  useHold: false,
  mechanicsWeights: DEFAULT_MECHANICS,
};

describe.skipIf(!PDCA)("PDCA search comparison", () => {
  it(
    "confirms final beam 3x12 vs 2-ply on 5x40 and 10x100",
    () => {
      const base40 = runConfiguredBenchmark(SEEDS40, plySpec(2), SHORT);
      const final40 = runConfiguredBenchmark(SEEDS40, FINAL, SHORT);
      const nohold40 = runConfiguredBenchmark(
        SEEDS40,
        { ...FINAL, name: "beam-3x12-nohold", mechanicsWeights: ZERO_MECHANICS },
        SHORT,
      );
      // eslint-disable-next-line no-console
      console.log("PDCA 40 BASELINE", formatSummary(base40));
      // eslint-disable-next-line no-console
      console.log("PDCA 40 FINAL", formatSummary(final40));
      // eslint-disable-next-line no-console
      console.log("PDCA 40 NOHOLD", formatSummary(nohold40));

      const base100 = runConfiguredBenchmark(SEEDS100, plySpec(2), LONG);
      const final100 = runConfiguredBenchmark(SEEDS100, FINAL, LONG);
      // eslint-disable-next-line no-console
      console.log("PDCA 100 BASELINE", formatSummary(base100));
      // eslint-disable-next-line no-console
      console.log("PDCA 100 FINAL", formatSummary(final100));
      // eslint-disable-next-line no-console
      console.log(
        "PDCA 100 BASELINE seeds",
        base100.results.map((r) => `s${r.seed}:L${r.lines}/S${r.score}/GO${Number(r.gameOver)}`).join(" "),
      );
      // eslint-disable-next-line no-console
      console.log(
        "PDCA 100 FINAL seeds",
        final100.results.map((r) => `s${r.seed}:L${r.lines}/S${r.score}/GO${Number(r.gameOver)}`).join(" "),
      );

      expect(final40.averageLines).toBeGreaterThanOrEqual(base40.averageLines);
      expect(final100.averageLines).toBeGreaterThanOrEqual(base100.averageLines);
      expect(final100.gameOverRate).toBeLessThanOrEqual(base100.gameOverRate);
    },
    180_000,
  );
});
