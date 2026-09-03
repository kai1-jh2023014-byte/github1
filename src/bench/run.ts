import { BrowserGameAdapter } from "../adapters/browser";
import { AIPlayer } from "../ai/player";
import type { SearchDepth } from "../ai/types";
import type { MechanicsWeights } from "../ai/weights";
import { ZERO_MECHANICS } from "../ai/weights";
import { GameEngine } from "../game/engine";
import { seededRandomizer } from "../game/seeded";

export interface SearchSpec {
  name?: string;
  algorithm: "ply" | "beam";
  depth: number;
  beamWidth?: number;
  useHold?: boolean;
  holdAtRootOnly?: boolean;
  mechanicsWeights?: MechanicsWeights;
}

export interface GameMetrics {
  seed: number;
  depth: SearchDepth;
  spec: SearchSpec;
  lines: number;
  score: number;
  pieces: number;
  gameOver: boolean;
  tetrises: number;
  holds: number;
  tSpins: number;
  tSpinMinis: number;
  maxCombo: number;
  b2bClears: number;
  perfectClears: number;
  decisionMsTotal: number;
  decisions: number;
  latencies: number[];
  nodes: number;
}

export interface BenchmarkSummary {
  games: number;
  depth: SearchDepth;
  spec: SearchSpec;
  averageLines: number;
  averageScore: number;
  maxLines: number;
  gameOverRate: number;
  tetrisRate: number;
  tSpinRate: number;
  perfectClearRate: number;
  averageDecisionMs: number;
  p50DecisionMs: number;
  p95DecisionMs: number;
  maxDecisionMs: number;
  averageNodes: number;
  averageHolds: number;
  averageTetrises: number;
  averageTSpins: number;
  averageMaxCombo: number;
  averageB2B: number;
  averagePC: number;
  results: GameMetrics[];
}

export interface RunGameOptions {
  seed: number;
  depth?: SearchDepth;
  maxPieces?: number;
  maxTicks?: number;
  spec?: SearchSpec;
}

export function plySpec(depth: number): SearchSpec {
  return {
    name: `${depth}-ply`,
    algorithm: "ply",
    depth,
    useHold: false,
    mechanicsWeights: ZERO_MECHANICS,
  };
}

export function runGame(options: RunGameOptions): GameMetrics {
  const spec = options.spec ?? plySpec(options.depth ?? 1);
  const maxPieces = options.maxPieces ?? 120;
  const maxTicks = options.maxTicks ?? 8000;
  const engine = new GameEngine({ randomizer: seededRandomizer(options.seed) });
  const adapter = new BrowserGameAdapter(engine);
  const latencies: number[] = [];
  let nodes = 0;
  const ai = new AIPlayer({
    depth: spec.depth,
    algorithm: spec.algorithm,
    beamWidth: spec.beamWidth,
    useHold: spec.useHold ?? false,
    holdAtRootOnly: spec.holdAtRootOnly,
    mechanicsWeights: spec.mechanicsWeights ?? ZERO_MECHANICS,
    actionDelayMs: 1,
    onResult: (result) => {
      latencies.push(result.elapsedMs);
      nodes += result.nodes;
    },
  });
  ai.setEnabled(true);
  engine.start();

  let now = 0;
  let pieces = 0;
  let lastId = engine.getCurrent()?.id ?? -1;

  for (let i = 0; i < maxTicks; i++) {
    now += 16;
    engine.tick(now);
    ai.tick(now, adapter);
    const current = engine.getCurrent();
    if (current && current.id !== lastId) {
      pieces += 1;
      lastId = current.id;
    }
    if (engine.getStatus() === "gameover") break;
    if (pieces >= maxPieces) break;
  }

  const snap = engine.getSnapshot();
  const stats = snap.stats;
  return {
    seed: options.seed,
    depth: spec.depth,
    spec,
    lines: snap.lines,
    score: snap.score,
    pieces,
    gameOver: snap.status === "gameover",
    tetrises: stats.tetrises,
    holds: stats.holds,
    tSpins: stats.tSpins,
    tSpinMinis: stats.tSpinMinis,
    maxCombo: stats.maxCombo,
    b2bClears: stats.b2bClears,
    perfectClears: stats.perfectClears,
    decisionMsTotal: latencies.reduce((sum, ms) => sum + ms, 0),
    decisions: latencies.length,
    latencies,
    nodes,
  };
}

export function runBenchmark(
  seeds: number[],
  depth: SearchDepth,
  options: { maxPieces?: number; maxTicks?: number } = {},
): BenchmarkSummary {
  return runConfiguredBenchmark(seeds, plySpec(depth), options);
}

export function runConfiguredBenchmark(
  seeds: number[],
  spec: SearchSpec,
  options: { maxPieces?: number; maxTicks?: number } = {},
): BenchmarkSummary {
  const results = seeds.map((seed) =>
    runGame({ seed, spec, maxPieces: options.maxPieces, maxTicks: options.maxTicks }),
  );
  return summarize(results, spec);
}

export function summarize(results: GameMetrics[], spec: SearchSpec): BenchmarkSummary {
  const games = results.length;
  const totalLines = results.reduce((sum, r) => sum + r.lines, 0);
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalDecisions = results.reduce((sum, r) => sum + r.decisions, 0);
  const totalDecisionMs = results.reduce((sum, r) => sum + r.decisionMsTotal, 0);
  const gameOvers = results.filter((r) => r.gameOver).length;
  const tetrises = results.reduce((sum, r) => sum + r.tetrises, 0);
  const pieces = results.reduce((sum, r) => sum + r.pieces, 0);
  const latencies = results.flatMap((r) => r.latencies);
  const nodes = results.reduce((sum, r) => sum + r.nodes, 0);
  const tSpins = results.reduce((sum, r) => sum + r.tSpins, 0);
  const pcs = results.reduce((sum, r) => sum + r.perfectClears, 0);

  return {
    games,
    depth: spec.depth,
    spec,
    averageLines: totalLines / games,
    averageScore: totalScore / games,
    maxLines: results.reduce((max, r) => Math.max(max, r.lines), 0),
    gameOverRate: gameOvers / games,
    tetrisRate: pieces === 0 ? 0 : tetrises / pieces,
    tSpinRate: pieces === 0 ? 0 : tSpins / pieces,
    perfectClearRate: pieces === 0 ? 0 : pcs / pieces,
    averageDecisionMs: totalDecisions === 0 ? 0 : totalDecisionMs / totalDecisions,
    p50DecisionMs: percentile(latencies, 50),
    p95DecisionMs: percentile(latencies, 95),
    maxDecisionMs: latencies.length === 0 ? 0 : Math.max(...latencies),
    averageNodes: totalDecisions === 0 ? 0 : nodes / totalDecisions,
    averageHolds: results.reduce((sum, r) => sum + r.holds, 0) / games,
    averageTetrises: results.reduce((sum, r) => sum + r.tetrises, 0) / games,
    averageTSpins: results.reduce((sum, r) => sum + r.tSpins, 0) / games,
    averageMaxCombo: results.reduce((sum, r) => sum + r.maxCombo, 0) / games,
    averageB2B: results.reduce((sum, r) => sum + r.b2bClears, 0) / games,
    averagePC: results.reduce((sum, r) => sum + r.perfectClears, 0) / games,
    results,
  };
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function formatSummary(summary: BenchmarkSummary): string {
  const name = summary.spec.name ?? `${summary.spec.algorithm}@${summary.depth}`;
  return [
    `name=${name}`,
    `games=${summary.games}`,
    `avgLines=${summary.averageLines.toFixed(2)}`,
    `avgScore=${summary.averageScore.toFixed(1)}`,
    `maxLines=${summary.maxLines}`,
    `gameOverRate=${summary.gameOverRate.toFixed(3)}`,
    `avgDecisionMs=${summary.averageDecisionMs.toFixed(3)}`,
    `p50=${summary.p50DecisionMs.toFixed(3)}`,
    `p95=${summary.p95DecisionMs.toFixed(3)}`,
    `maxMs=${summary.maxDecisionMs.toFixed(3)}`,
    `avgNodes=${summary.averageNodes.toFixed(1)}`,
    `holds=${summary.averageHolds.toFixed(2)}`,
    `tetrises=${summary.averageTetrises.toFixed(2)}`,
    `tSpins=${summary.averageTSpins.toFixed(2)}`,
    `ren=${summary.averageMaxCombo.toFixed(2)}`,
    `b2b=${summary.averageB2B.toFixed(2)}`,
    `pc=${summary.averagePC.toFixed(2)}`,
  ].join(" ");
}
