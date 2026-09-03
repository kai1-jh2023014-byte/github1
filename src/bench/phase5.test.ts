import { describe, expect, it } from "vitest";
import { DEFAULT_BEAM } from "../core/beam";
import { DEFAULT_WEIGHTS } from "../ai/weights";
import {
  PHASE5_FROZEN,
  PHASE5_WIDTHS,
  classifyWidthSensitivity,
  logDiversity,
  logExpertDiagnostics,
  logMoveChanges,
  logWidthBenchmarks,
  runExpertDiagnostics,
  runSameStateMoveDiagnostic,
  runWidthBenchmarks,
} from "./phase5";
import { SEEDS40 } from "./phase2";

const RUN =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PHASE5 ===
  "1";

describe("Phase 5-A beam width diagnostic", () => {
  it("does not change production beam width or DEFAULT_WEIGHTS", () => {
    expect(DEFAULT_BEAM.beamWidth).toBe(12);
    expect(DEFAULT_BEAM.depth).toBe(3);
    expect(DEFAULT_WEIGHTS.linesCleared).toBe(0.76);
    expect(PHASE5_FROZEN.beamWidth).toBe(12);
    expect(PHASE5_FROZEN.useGatedHold).toBe(true);
    expect(PHASE5_FROZEN.wellReservation).toBe(true);
    expect(PHASE5_FROZEN.wellDelta).toBe(false);
    expect(PHASE5_FROZEN.holeDelta).toBe(false);
    expect(PHASE5_FROZEN.surfaceDelta).toBe(false);
  });

  it("lists the required diagnostic widths", () => {
    expect([...PHASE5_WIDTHS]).toEqual([4, 8, 12, 16, 24, 32]);
  });
});

describe.skipIf(!RUN)("Phase 5-A full diagnostic", () => {
  it(
    "benchmarks widths, expert replay, move-change, and diversity",
    () => {
      const benchmarks = runWidthBenchmarks();
      logWidthBenchmarks(benchmarks);

      const expert = runExpertDiagnostics(64, 1);
      logExpertDiagnostics(expert);

      const { moveChanges, diversity } = runSameStateMoveDiagnostic(SEEDS40, 40);
      logMoveChanges(moveChanges);
      logDiversity(diversity);

      const verdict = classifyWidthSensitivity(benchmarks, expert);
      // eslint-disable-next-line no-console
      console.log("PHASE5 classification", verdict.case, verdict.summary);

      const w12 = benchmarks.find((r) => r.width === 12);
      expect(w12).toBeDefined();
      expect(w12!.protocols.find((p) => p.protocol === "10x100")!.summary.averageLines).toBeGreaterThan(0);
    },
    900_000,
  );
});
