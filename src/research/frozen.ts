import { DEFAULT_BEAM } from "../core/beam";
import { DEFAULT_MECHANICS, DEFAULT_WEIGHTS } from "../ai/weights";
import type { SearchContext } from "../core/search";

/**
 * Frozen Phase-1 baseline. Do not change these values here to "improve" the AI.
 * Research compares against this snapshot of Beam 3×12.
 */
export const FROZEN_BEAM = {
  depth: 3,
  beamWidth: 12,
  useHold: false as const,
  useSpins: true as const,
  holdAtRootOnly: true as const,
};

export function frozenSearchContext(): SearchContext {
  return {
    weights: DEFAULT_WEIGHTS,
    depth: FROZEN_BEAM.depth,
    beamWidth: FROZEN_BEAM.beamWidth,
    useHold: FROZEN_BEAM.useHold,
    holdAtRootOnly: FROZEN_BEAM.holdAtRootOnly,
    mechanicsWeights: DEFAULT_MECHANICS,
    useGatedHold: false,
    wellReservation: false,
    surfaceOverhang: false,
    futureSetup: false,
    tspinSetup: false,
    futureClear: false,
  };
}

export function frozenBaselineUnchanged(): string[] {
  const errors: string[] = [];
  if (DEFAULT_BEAM.depth !== FROZEN_BEAM.depth) errors.push("DEFAULT_BEAM.depth changed");
  if (DEFAULT_BEAM.beamWidth !== FROZEN_BEAM.beamWidth) errors.push("DEFAULT_BEAM.beamWidth changed");
  if (DEFAULT_BEAM.useHold !== FROZEN_BEAM.useHold) errors.push("DEFAULT_BEAM.useHold changed");
  if (DEFAULT_WEIGHTS.linesCleared !== 0.76) errors.push("DEFAULT_WEIGHTS.linesCleared changed");
  if (DEFAULT_WEIGHTS.holes !== -0.36) errors.push("DEFAULT_WEIGHTS.holes changed");
  if (DEFAULT_MECHANICS.tSpin <= 0) errors.push("DEFAULT_MECHANICS T-spin evaluation turned off");
  if (DEFAULT_MECHANICS.combo <= 0) errors.push("DEFAULT_MECHANICS REN evaluation turned off");
  if (DEFAULT_MECHANICS.backToBack <= 0) errors.push("DEFAULT_MECHANICS B2B evaluation turned off");
  return errors;
}
