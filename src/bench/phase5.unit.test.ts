import { describe, expect, it } from "vitest";
import { BeamSearch } from "../core/beam";
import { adoptedContext, analyzeRootCandidates } from "./phase5";
import { emptyPlayingState } from "../research/state";
import type { TetrominoType } from "../game/types";

describe("phase5 analyzeRootCandidates", () => {
  it("counts unique placements on an empty start board", () => {
    const queue: TetrominoType[] = ["T", "I", "J", "L", "O", "S", "Z"];
    const state = emptyPlayingState(queue);
    const beam = new BeamSearch();
    const result = beam.search(state, adoptedContext(12));
    const stats = analyzeRootCandidates(result);
    expect(stats.candidateCount).toBeGreaterThan(0);
    expect(stats.uniquePlacements).toBe(stats.candidateCount);
  });
});
