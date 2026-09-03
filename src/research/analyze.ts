import { renderFrame } from "../vision/render";
import { playExpertFixture } from "./fixture";
import { rankHumanVsFrozenBeam, agreement } from "./compare";
import { classifyGap } from "./classify";
import { reconstructFromFrames } from "./reconstruct";
import { occupancyKey } from "./frameDetect";
import { extractFrames, probeVideo, writeVideo } from "./video";
import { buildHypotheses, writeReport, type AnalysisResult } from "./report";
import { frozenBaselineUnchanged } from "./frozen";
import { behaviorStats } from "./stats";
import type { DatasetStats, DecisionGap, ReplayStep } from "./types";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function analyzeFixture(options: { seed: number; pieces: number; source: string }): AnalysisResult {
  const drift = frozenBaselineUnchanged();
  if (drift.length) {
    throw new Error(`Frozen baseline drifted: ${drift.join(", ")}`);
  }
  const steps = playExpertFixture(options);
  return analyzeSteps(steps, {
    source: options.source,
    durationSec: steps.length,
    frames: steps.length * 2,
    validStates: steps.length,
    validActions: steps.length,
    meanConfidence: meanConf(steps),
    missingRate: 0,
  });
}

export function analyzeSteps(steps: ReplayStep[], dataset: DatasetStats): AnalysisResult {
  const gaps: DecisionGap[] = [];
  const ranks = steps.map((step) => {
    const ranked = rankHumanVsFrozenBeam(step);
    const gap = classifyGap(step, ranked);
    gaps.push(gap);
    return ranked;
  });
  const stats = agreement(ranks);
  const disagree = gaps.filter((g) => g.category !== "agree");
  const examples = pickExamples(disagree, 12);
  return {
    dataset,
    agreement: stats,
    behavior: behaviorStats(steps, gaps),
    gaps,
    examples,
    hypotheses: buildHypotheses(gaps, stats),
  };
}

export function roundTripVideo(steps: ReplayStep[], videoPath: string): {
  reconstructed: ReplayStep[];
  matchRate: number;
} {
  const frames = steps.flatMap((step, i) => {
    const spawn = renderFrame(step.stateBefore.board, step.stateBefore.current);
    // Locked occupancy only — a floating next piece would pollute reconstruction.
    const after = renderFrame(step.stateAfter.board, null);
    return [
      { time: i, buffer: spawn },
      { time: i + 0.4, buffer: after },
    ];
  });
  mkdirSync(join(videoPath, ".."), { recursive: true });
  writeVideo(videoPath, frames.map((f) => f.buffer), 5);
  const extracted = extractFrames(videoPath, 5);
  const reconstructed = reconstructFromFrames(extracted.frames);
  let match = 0;
  const n = Math.min(steps.length, reconstructed.length);
  for (let i = 0; i < n; i++) {
    if (occupancyKey(steps[i]!.stateAfter.board) === occupancyKey(reconstructed[i]!.stateAfter.board)) {
      match += 1;
    }
  }
  return { reconstructed, matchRate: n === 0 ? 0 : match / n };
}

export function analyzeVideoFile(path: string): AnalysisResult {
  const info = probeVideo(path);
  if (!info) throw new Error(`Cannot probe ${path}`);
  const extracted = extractFrames(path, 6);
  const steps = reconstructFromFrames(extracted.frames);
  const usable = steps.filter((s) => s.confidence.action >= 0.5 && s.confidence.board >= 0.5);
  return analyzeSteps(usable, {
    source: path,
    durationSec: info.durationSec,
    frames: extracted.frames.length,
    validStates: usable.length,
    validActions: usable.length,
    meanConfidence: meanConf(usable),
    missingRate: extracted.frames.length === 0 ? 1 : 1 - usable.length / Math.max(1, steps.length || extracted.frames.length),
  });
}

export function writeAnalysisArtifacts(result: AnalysisResult, dir = "docs/research"): void {
  mkdirSync(dir, { recursive: true });
  writeReport(join(dir, "expert-replay-analysis.md"), result);
  writeFileSync(
    join(dir, "dataset-summary.json"),
    JSON.stringify(
      {
        dataset: result.dataset,
        agreement: result.agreement,
        behavior: result.behavior,
        gapCounts: result.gaps.reduce<Record<string, number>>((acc, g) => {
          acc[g.category] = (acc[g.category] ?? 0) + 1;
          return acc;
        }, {}),
        hypotheses: result.hypotheses,
        examples: result.examples.map((ex) => ({
          index: ex.step.index,
          category: ex.category,
          reason: ex.reason,
          missingFeature: ex.missingFeature,
          human: ex.step.human,
          ai: ex.ranked.aiPlacement,
          rank: ex.ranked.rank,
          confidence: ex.confidence,
        })),
      },
      null,
      2,
    ),
  );
}

function meanConf(steps: ReplayStep[]): DatasetStats["meanConfidence"] {
  if (steps.length === 0) {
    return { board: 0, current: 0, next: 0, hold: 0, action: 0 };
  }
  const sum = { board: 0, current: 0, next: 0, hold: 0, action: 0 };
  for (const step of steps) {
    sum.board += step.confidence.board;
    sum.current += step.confidence.current;
    sum.next += step.confidence.next;
    sum.hold += step.confidence.hold;
    sum.action += step.confidence.action;
  }
  const n = steps.length;
  return {
    board: sum.board / n,
    current: sum.current / n,
    next: sum.next / n,
    hold: sum.hold / n,
    action: sum.action / n,
  };
}

function pickExamples(gaps: DecisionGap[], limit: number): DecisionGap[] {
  const byCat = new Map<string, DecisionGap[]>();
  for (const gap of gaps) {
    const list = byCat.get(gap.category) ?? [];
    list.push(gap);
    byCat.set(gap.category, list);
  }
  const picked: DecisionGap[] = [];
  while (picked.length < limit) {
    let added = false;
    for (const list of byCat.values()) {
      const next = list.shift();
      if (!next) continue;
      picked.push(next);
      added = true;
      if (picked.length >= limit) break;
    }
    if (!added) break;
  }
  return picked.slice(0, limit);
}
