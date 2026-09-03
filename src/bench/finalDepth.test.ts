import { describe, expect, it } from "vitest";
import { DEFAULT_BEAM } from "../core/beam";
import {
  FINAL_DEPTHS,
  PRODUCTION_FROZEN,
  evaluateDepth4Adoption,
  logDepthBenchmarks,
  logDepthChange,
  runDepth34ChangeDiagnostic,
  runDepthBenchmarks,
} from "./finalDepth";

const RUN =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.FINAL ===
  "1";

describe("Production frozen configuration", () => {
  it("matches DEFAULT_BEAM and keeps experimental flags off", () => {
    expect(PRODUCTION_FROZEN.depth).toBe(3);
    expect(PRODUCTION_FROZEN.beamWidth).toBe(12);
    expect(DEFAULT_BEAM.depth).toBe(PRODUCTION_FROZEN.depth);
    expect(DEFAULT_BEAM.beamWidth).toBe(PRODUCTION_FROZEN.beamWidth);
    expect(DEFAULT_BEAM.useGatedHold).toBe(true);
    expect(DEFAULT_BEAM.wellReservation).toBe(true);
    expect(DEFAULT_BEAM.useHold).toBe(false);
    expect(DEFAULT_BEAM.futureSetup).toBe(false);
    expect(DEFAULT_BEAM.wellDelta).toBe(false);
    expect(DEFAULT_BEAM.holeDelta).toBe(false);
    expect(DEFAULT_BEAM.surfaceDelta).toBe(false);
  });

  it("lists depths 1–4 for the final experiment", () => {
    expect([...FINAL_DEPTHS]).toEqual([1, 2, 3, 4]);
  });
});

describe.skipIf(!RUN)("Final depth sensitivity", () => {
  it(
    "benchmarks depths 1–4 and evaluates depth-4 adoption",
    () => {
      const rows = runDepthBenchmarks();
      logDepthBenchmarks(rows);

      const change = runDepth34ChangeDiagnostic();
      logDepthChange(change);

      const verdict = evaluateDepth4Adoption(rows);
      // eslint-disable-next-line no-console
      console.log("FINAL depth4 adopt?", verdict.adopt, verdict.reasons.join("; ") || "ok");

      expect(rows.find((r) => r.depth === 3)).toBeDefined();
      expect(change.decisions).toBeGreaterThan(0);
    },
    900_000,
  );
});
