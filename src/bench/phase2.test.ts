import { describe, expect, it } from "vitest";
import { DEFAULT_BEAM } from "../core/beam";
import {
  FROZEN_SPEC,
  gatedHoldSpec,
  logProtocol,
  passesVsFrozen,
  runProtocol,
  surfaceSpec,
  wellSpec,
} from "./phase2";

const RUN =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PHASE2 ===
  "1";

describe("Phase 2 flags", () => {
  it("keeps unconditional Hold off on the live default", () => {
    expect(DEFAULT_BEAM.useHold).toBe(false);
    expect(DEFAULT_BEAM.depth).toBe(3);
    expect(DEFAULT_BEAM.beamWidth).toBe(12);
  });
});

describe.skipIf(!RUN)("Phase 2 A/B vs frozen Beam 3×12", () => {
  it(
    "runs A then B then C then D on 5x40, 5x100, and 10x100",
    () => {
      const frozen = runProtocol(FROZEN_SPEC);
      logProtocol("A-frozen", frozen);

      const b = runProtocol(gatedHoldSpec(FROZEN_SPEC));
      logProtocol("B-gated-hold", b);
      const bGate = passesVsFrozen(b, frozen);
      // eslint-disable-next-line no-console
      console.log("PHASE2 B keep?", bGate.pass, bGate.reasons.join("; ") || "ok");

      const specAfterB = bGate.pass ? gatedHoldSpec(FROZEN_SPEC) : FROZEN_SPEC;

      const c = runProtocol(wellSpec(specAfterB));
      logProtocol("C-well-i", c);
      const cGate = passesVsFrozen(c, frozen);
      // eslint-disable-next-line no-console
      console.log("PHASE2 C keep?", cGate.pass, cGate.reasons.join("; ") || "ok");

      const specAfterC = cGate.pass ? wellSpec(specAfterB) : specAfterB;

      const d = runProtocol(surfaceSpec(specAfterC));
      logProtocol("D-surface", d);
      const dGate = passesVsFrozen(d, frozen);
      // eslint-disable-next-line no-console
      console.log("PHASE2 D keep?", dGate.pass, dGate.reasons.join("; ") || "ok");

      expect(frozen[0]!.summary.averageLines).toBeGreaterThan(0);
      expect(b[0]!.summary.averageLines).toBeGreaterThan(0);
    },
    300_000,
  );
});
