import { describe, expect, it } from "vitest";
import { DEFAULT_BEAM } from "../core/beam";
import { DEFAULT_WEIGHTS } from "../ai/weights";
import {
  HOLE_WEIGHTS,
  PHASE4_FROZEN,
  SURFACE_WEIGHTS,
  WELL_WEIGHTS,
  logDelta,
  logProtocol,
  passesPhase4,
  pickSweepWinner,
  runProtocol,
  sweep5x40,
  withHoleDelta,
  withSurfaceDelta,
  withWellDelta,
} from "./phase4";
import type { SearchSpec } from "./run";
import type { DeltaWeights } from "../ai/delta";

const RUN =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PHASE4 ===
  "1";

describe("Phase 4 flags", () => {
  it("keeps the Phase 3 freeze: deltas off, DEFAULT_WEIGHTS and Beam size unchanged", () => {
    expect(DEFAULT_WEIGHTS.linesCleared).toBe(0.76);
    expect(DEFAULT_WEIGHTS.holes).toBe(-0.36);
    expect(DEFAULT_BEAM.depth).toBe(3);
    expect(DEFAULT_BEAM.beamWidth).toBe(12);
    expect(DEFAULT_BEAM.useHold).toBe(false);
    expect(DEFAULT_BEAM.useGatedHold).toBe(true);
    expect(DEFAULT_BEAM.wellReservation).toBe(true);
    expect(DEFAULT_BEAM.futureSetup).toBe(false);
    expect(DEFAULT_BEAM.tspinSetup).toBe(false);
    expect(DEFAULT_BEAM.futureClear).toBe(false);
    expect(DEFAULT_BEAM.wellDelta).toBe(false);
    expect(DEFAULT_BEAM.holeDelta).toBe(false);
    expect(DEFAULT_BEAM.surfaceDelta).toBe(false);
    expect(PHASE4_FROZEN.wellDelta).toBe(false);
    expect(PHASE4_FROZEN.holeDelta).toBe(false);
    expect(PHASE4_FROZEN.surfaceDelta).toBe(false);
  });
});

describe.skipIf(!RUN)("Phase 4 A/B vs Phase 3 live freeze", () => {
  it(
    "runs Well Delta, Hole Delta, then Surface Damage Delta",
    () => {
      const frozen = runProtocol(PHASE4_FROZEN);
      logProtocol("phase4-frozen", frozen);
      const base40 = frozen.find((r) => r.protocol === "5x40")!.summary;
      let live: SearchSpec = PHASE4_FROZEN;

      const wellSweep = sweep5x40(live, withWellDelta, WELL_WEIGHTS);
      const wellPick = pickSweepWinner(wellSweep, { lines: base40.averageLines, score: base40.averageScore });
      // eslint-disable-next-line no-console
      console.log("PHASE4 A sweep pick", wellPick);
      let wellKept = false;
      if (wellPick) {
        const spec = withWellDelta(live, WELL_WEIGHTS[wellPick as keyof typeof WELL_WEIGHTS] as DeltaWeights);
        const full = runProtocol(spec);
        logProtocol("A-well-delta", full);
        for (const row of full) {
          logDelta(`${row.protocol}-well`, row.summary.deltaWell);
        }
        const gate = passesPhase4(full, frozen);
        // eslint-disable-next-line no-console
        console.log("PHASE4 A keep?", gate.pass, gate.reasons.join("; ") || "ok");
        if (gate.pass) {
          live = spec;
          wellKept = true;
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("PHASE4 A keep? false no 5x40-viable weight");
      }

      const holeSweep = sweep5x40(live, withHoleDelta, HOLE_WEIGHTS);
      const holePick = pickSweepWinner(holeSweep, { lines: base40.averageLines, score: base40.averageScore });
      // eslint-disable-next-line no-console
      console.log("PHASE4 B sweep pick", holePick);
      let holeKept = false;
      if (holePick) {
        const spec = withHoleDelta(live, HOLE_WEIGHTS[holePick as keyof typeof HOLE_WEIGHTS] as DeltaWeights);
        const full = runProtocol(spec);
        logProtocol("B-hole-delta", full);
        for (const row of full) logDelta(`${row.protocol}-hole`, row.summary.deltaHole);
        const gate = passesPhase4(full, frozen);
        // eslint-disable-next-line no-console
        console.log("PHASE4 B keep?", gate.pass, gate.reasons.join("; ") || "ok");
        if (gate.pass) {
          live = spec;
          holeKept = true;
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("PHASE4 B keep? false no 5x40-viable weight");
      }

      const surfaceSweep = sweep5x40(live, withSurfaceDelta, SURFACE_WEIGHTS);
      const surfacePick = pickSweepWinner(surfaceSweep, { lines: base40.averageLines, score: base40.averageScore });
      // eslint-disable-next-line no-console
      console.log("PHASE4 C sweep pick", surfacePick);
      if (surfacePick) {
        const spec = withSurfaceDelta(
          live,
          SURFACE_WEIGHTS[surfacePick as keyof typeof SURFACE_WEIGHTS] as DeltaWeights,
        );
        const full = runProtocol(spec);
        logProtocol("C-surface-delta", full);
        for (const row of full) logDelta(`${row.protocol}-surface`, row.summary.deltaSurface);
        const gate = passesPhase4(full, frozen);
        // eslint-disable-next-line no-console
        console.log("PHASE4 C keep?", gate.pass, gate.reasons.join("; ") || "ok");
        if (gate.pass) live = spec;
      } else {
        // eslint-disable-next-line no-console
        console.log("PHASE4 C keep? false no 5x40-viable weight");
      }

      // eslint-disable-next-line no-console
      console.log(
        "PHASE4 adopted spec",
        JSON.stringify({
          wellDelta: live.wellDelta,
          holeDelta: live.holeDelta,
          surfaceDelta: live.surfaceDelta,
          deltaWeights: live.deltaWeights,
          wellKept,
          holeKept,
        }),
      );
      expect(frozen[0]!.summary.averageLines).toBeGreaterThan(0);
    },
    420_000,
  );
});
