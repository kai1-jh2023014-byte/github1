import { BrowserGameAdapter } from "../adapters/browser";
import { AIPlayer } from "../ai/player";
import type { SearchDepth } from "../ai/types";
import { GameEngine } from "../game/engine";
import { seededRandomizer } from "../game/seeded";

export interface GameMetrics {
  seed: number;
  depth: SearchDepth;
  lines: number;
  score: number;
  pieces: number;
  gameOver: boolean;
  tetrises: number;
  decisionMsTotal: number;
  decisions: number;
}

export interface BenchmarkSummary {
  games: number;
  depth: SearchDepth;
  averageLines: number;
  averageScore: number;
  maxLines: number;
  gameOverRate: number;
  tetrisRate: number;
  tSpinRate: number;
  perfectClearRate: number;
  averageDecisionMs: number;
  results: GameMetrics[];
}

export interface RunGameOptions {
  seed: number;
  depth?: SearchDepth;
  maxPieces?: number;
  maxTicks?: number;
}

export function runGame(options: RunGameOptions): GameMetrics {
  const depth = options.depth ?? 1;
  const maxPieces = options.maxPieces ?? 120;
  const maxTicks = options.maxTicks ?? 8000;
  const engine = new GameEngine({ randomizer: seededRandomizer(options.seed) });
  const adapter = new BrowserGameAdapter(engine);
  let decisionMsTotal = 0;
  let decisions = 0;
  const ai = new AIPlayer({
    depth,
    actionDelayMs: 1,
    onResult: (result) => {
      decisionMsTotal += result.elapsedMs;
      decisions += 1;
    },
  });
  ai.setEnabled(true);
  engine.start();

  let now = 0;
  let pieces = 0;
  let lastId = engine.getCurrent()?.id ?? -1;
  let tetrises = 0;
  let lastLines = 0;

  for (let i = 0; i < maxTicks; i++) {
    now += 16;
    engine.tick(now);
    ai.tick(now, adapter);
    const current = engine.getCurrent();
    if (current && current.id !== lastId) {
      pieces += 1;
      lastId = current.id;
    }
    const lines = engine.getSnapshot().lines;
    if (lines - lastLines >= 4) tetrises += 1;
    lastLines = lines;
    if (engine.getStatus() === "gameover") break;
    if (pieces >= maxPieces) break;
  }

  const snap = engine.getSnapshot();
  return {
    seed: options.seed,
    depth,
    lines: snap.lines,
    score: snap.score,
    pieces,
    gameOver: snap.status === "gameover",
    tetrises,
    decisionMsTotal,
    decisions,
  };
}

export function runBenchmark(
  seeds: number[],
  depth: SearchDepth,
  options: { maxPieces?: number; maxTicks?: number } = {},
): BenchmarkSummary {
  const results = seeds.map((seed) =>
    runGame({ seed, depth, maxPieces: options.maxPieces, maxTicks: options.maxTicks }),
  );
  const games = results.length;
  const totalLines = results.reduce((sum, r) => sum + r.lines, 0);
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalDecisions = results.reduce((sum, r) => sum + r.decisions, 0);
  const totalDecisionMs = results.reduce((sum, r) => sum + r.decisionMsTotal, 0);
  const gameOvers = results.filter((r) => r.gameOver).length;
  const tetrises = results.reduce((sum, r) => sum + r.tetrises, 0);
  const pieces = results.reduce((sum, r) => sum + r.pieces, 0);

  return {
    games,
    depth,
    averageLines: totalLines / games,
    averageScore: totalScore / games,
    maxLines: results.reduce((max, r) => Math.max(max, r.lines), 0),
    gameOverRate: gameOvers / games,
    tetrisRate: pieces === 0 ? 0 : tetrises / pieces,
    tSpinRate: 0,
    perfectClearRate: 0,
    averageDecisionMs: totalDecisions === 0 ? 0 : totalDecisionMs / totalDecisions,
    results,
  };
}

export function formatSummary(summary: BenchmarkSummary): string {
  return [
    `games=${summary.games}`,
    `depth=${summary.depth}`,
    `avgLines=${summary.averageLines.toFixed(2)}`,
    `avgScore=${summary.averageScore.toFixed(1)}`,
    `maxLines=${summary.maxLines}`,
    `gameOverRate=${summary.gameOverRate.toFixed(3)}`,
    `tetrisRate=${summary.tetrisRate.toFixed(3)}`,
    `tSpinRate=${summary.tSpinRate.toFixed(3)}`,
    `perfectClearRate=${summary.perfectClearRate.toFixed(3)}`,
    `avgDecisionMs=${summary.averageDecisionMs.toFixed(3)}`,
  ].join(" ");
}
