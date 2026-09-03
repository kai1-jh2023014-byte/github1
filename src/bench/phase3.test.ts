import { describe, expect, it } from "vitest";
import { DEFAULT_BEAM } from "../core/beam";
import { DEFAULT_WEIGHTS } from "../ai/weights";
import {
  CLEAR_WEIGHTS,
  PHASE3_FROZEN,
  SETUP_WEIGHTS,
  TSPIN_WEIGHTS,
  logProtocol,
  passesPhase3,
  pickSweepWinner,
  runProtocol,
  sweep5x40,
  withClear,
  withSetup,
  withTspin,
} from "./phase3";
import type { SearchSpec } from "./run";
import type { FutureWeights } from "../ai/future";

const RUN =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PHASE3 ===
  "1";

describe("Phase 3 flags", () => {
  it("does not change frozen 2-ply weights or Beam size", () => {
    expect(DEFAULT_WEIGHTS.linesCleared).toBe(0.76);
    expect(DEFAULT_BEAM.depth).toBe(3);
    expect(DEFAULT_BEAM.beamWidth).toBe(12);
    expect(DEFAULT_BEAM.useHold).toBe(false);
    expect(DEFAULT_BEAM.useGatedHold).toBe(true);
    expect(DEFAULT_BEAM.wellReservation).toBe(true);
  });
});

describe.skipIf(!RUN)("Phase 3 A/B vs Phase 2 live freeze", () => {
  it(
    "runs Future Setup, T-spin setup, then Future Clear",
    () => {
      const frozen = runProtocol(PHASE3_FROZEN);
      logProtocol("phase3-frozen", frozen);
      const base40 = frozen.find((r) => r.protocol === "5x40")!.summary;
      let live: SearchSpec = PHASE3_FROZEN;

      const setupSweep = sweep5x40(live, withSetup, SETUP_WEIGHTS);
      const setupPick = pickSweepWinner(setupSweep, { lines: base40.averageLines, score: base40.averageScore });
      // eslint-disable-next-line no-console
      console.log("PHASE3 A sweep pick", setupPick);
      let setupKept = false;
      if (setupPick) {
        const spec = withSetup(live, SETUP_WEIGHTS[setupPick as keyof typeof SETUP_WEIGHTS] as FutureWeights);
        const full = runProtocol(spec);
        logProtocol("A-future-setup", full);
        const gate = passesPhase3(full, frozen);
        // eslint-disable-next-line no-console
        console.log("PHASE3 A keep?", gate.pass, gate.reasons.join("; ") || "ok");
        if (gate.pass) {
          live = spec;
          setupKept = true;
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("PHASE3 A keep? false no 5x40-viable weight");
      }

      const tspinSweep = sweep5x40(live, withTspin, TSPIN_WEIGHTS);
      const tspinChoice = pickSweepWinner(tspinSweep, { lines: base40.averageLines, score: base40.averageScore });
      // eslint-disable-next-line no-console
      console.log("PHASE3 B sweep pick", tspinChoice);
      let tspinKept = false;
      if (tspinChoice) {
        const spec = withTspin(live, TSPIN_WEIGHTS[tspinChoice as keyof typeof TSPIN_WEIGHTS] as FutureWeights);
        const full = runProtocol(spec);
        logProtocol("B-tspin-setup", full);
        const gate = passesPhase3(full, frozen);
        // eslint-disable-next-line no-console
        console.log("PHASE3 B keep?", gate.pass, gate.reasons.join("; ") || "ok");
        if (gate.pass) {
          live = spec;
          tspinKept = true;
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("PHASE3 B keep? false no 5x40-viable weight");
      }

      const clearSweep = sweep5x40(live, withClear, CLEAR_WEIGHTS);
      const clearChoice = pickSweepWinner(clearSweep, { lines: base40.averageLines, score: base40.averageScore });
      // eslint-disable-next-line no-console
      console.log("PHASE3 C sweep pick", clearChoice);
      if (clearChoice) {
        const spec = withClear(live, CLEAR_WEIGHTS[clearChoice as keyof typeof CLEAR_WEIGHTS] as FutureWeights);
        const full = runProtocol(spec);
        logProtocol("C-future-clear", full);
        const gate = passesPhase3(full, frozen);
        // eslint-disable-next-line no-console
        console.log("PHASE3 C keep?", gate.pass, gate.reasons.join("; ") || "ok");
        if (gate.pass) live = spec;
      } else {
        // eslint-disable-next-line no-console
        console.log("PHASE3 C keep? false no 5x40-viable weight");
      }

      // eslint-disable-next-line no-console
      console.log("PHASE3 adopted spec", JSON.stringify({
        futureSetup: live.futureSetup,
        tspinSetup: live.tspinSetup,
        futureClear: live.futureClear,
        futureWeights: live.futureWeights,
        setupKept,
        tspinKept,
      }));
      expect(frozen[0]!.summary.averageLines).toBeGreaterThan(0);
    },
    420_000,
  );
});
