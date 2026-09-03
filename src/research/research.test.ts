import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderFrame } from "../vision/render";
import { occupancyKey, detectNativeBoard } from "./frameDetect";
import { frozenBaselineUnchanged } from "./frozen";
import { playExpertFixture, dealPieces } from "./fixture";
import { reconstructFromFrames } from "./reconstruct";
import { rankHumanVsFrozenBeam, agreement } from "./compare";
import { classifyGap } from "./classify";
import { analyzeFixture, roundTripVideo, writeAnalysisArtifacts } from "./analyze";
import { applyAction, emptyPlayingState } from "./state";
import { chooseExpertAction } from "./expert";

describe("Phase 1 expert replay research", () => {
  it("does not drift the frozen Beam 3×12 baseline", () => {
    expect(frozenBaselineUnchanged()).toEqual([]);
  });

  it("plays a guideline-expert fixture with confidence=1", () => {
    const steps = playExpertFixture({ seed: 3, pieces: 12 });
    expect(steps.length).toBeGreaterThan(8);
    expect(steps[0]!.confidence.action).toBe(1);
    expect(steps[0]!.human.spawn).toBe(true);
    expect(steps[0]!.human.hardDrop).toBe(true);
    expect(steps[0]!.stateBefore.current).not.toBeNull();
  });

  it("detects a native rendered board with high confidence", () => {
    const queue = dealPieces(1, 6);
    const state = emptyPlayingState(queue);
    const action = chooseExpertAction(state);
    expect(action).not.toBeNull();
    const applied = applyAction(state, action!);
    expect(applied).not.toBeNull();
    const frame = renderFrame(applied!.next.board, applied!.next.current);
    const detected = detectNativeBoard(frame);
    expect(detected).not.toBeNull();
    expect(detected!.confidence.board).toBeGreaterThan(0.9);
    expect(occupancyKey(detected!.state.board)).toBe(occupancyKey(applied!.next.board));
  });

  it("reconstructs placements from rendered occupancy frames", () => {
    const steps = playExpertFixture({ seed: 2, pieces: 8 });
    const frames = steps.flatMap((step, i) => [
      { time: i, buffer: renderFrame(step.stateBefore.board, step.stateBefore.current) },
      { time: i + 0.5, buffer: renderFrame(step.stateAfter.board, null) },
    ]);
    const reconstructed = reconstructFromFrames(frames);
    expect(reconstructed.length).toBeGreaterThan(0);
    let occupancyMatch = 0;
    const n = Math.min(steps.length, reconstructed.length);
    for (let i = 0; i < n; i++) {
      if (occupancyKey(steps[i]!.stateAfter.board) === occupancyKey(reconstructed[i]!.stateAfter.board)) {
        occupancyMatch += 1;
      }
    }
    expect(occupancyMatch / n).toBeGreaterThan(0.7);
    expect(reconstructed[0]!.confidence.action).toBeGreaterThan(0.5);
  });

  it("ranks fixture actions against frozen Beam 3×12", () => {
    const steps = playExpertFixture({ seed: 1, pieces: 6 });
    const ranks = steps.map((step) => rankHumanVsFrozenBeam(step));
    const stats = agreement(ranks);
    expect(stats.compared).toBe(steps.length);
    expect(Number.isFinite(stats.avgAiScore)).toBe(true);
    const classified = classifyGap(steps[0]!, ranks[0]!);
    if (ranks[0]!.inTop1) expect(classified.category).toBe("agree");
    else expect(classified.category).not.toBe("agree");
  });

  it(
    "writes the Phase 1 analysis report from the labeled fixture",
    () => {
      const result = analyzeFixture({
        seed: 1,
        pieces: 48,
        source:
          "guideline-expert fixture (no source mp4 in workspace; renderer ground truth, confidence=1)",
      });
      expect(result.agreement.compared).toBeGreaterThan(20);
      expect(result.examples.length).toBeGreaterThanOrEqual(Math.min(10, result.gaps.filter((g) => g.category !== "agree").length));
      expect(result.hypotheses.length).toBeGreaterThan(0);
      expect(result.hypotheses.length).toBeLessThanOrEqual(10);
      writeAnalysisArtifacts(result, "docs/research");
      expect(result.dataset.meanConfidence.board).toBe(1);
    },
    120_000,
  );

  it(
    "round-trips a short fixture through ffmpeg without inventing unmatched cells",
    () => {
      const steps = playExpertFixture({ seed: 4, pieces: 6 });
      const dir = mkdtempSync(join(tmpdir(), "tetris-replay-"));
      const videoPath = join(dir, "expert.mp4");
      const { reconstructed, matchRate } = roundTripVideo(steps, videoPath);
      expect(reconstructed.length).toBeGreaterThan(0);
      expect(matchRate).toBeGreaterThan(0.5);
    },
    60_000,
  );
});
