import { BrowserGameAdapter } from "../adapters/browser";
import { BeamSearch } from "../core/beam";
import { ControlLoop } from "../core/loop";
import { TetrisAICore } from "../core/ai";
import { DEFAULT_WEIGHTS, DEFAULT_MECHANICS } from "../ai/weights";
import type { Placement, ScoredCandidate, SearchResult } from "../ai/types";
import type { SearchContext } from "../core/search";
import { GameEngine } from "../game/engine";
import { seededRandomizer } from "../game/seeded";
import { playExpertFixture } from "../research/fixture";
import { agreement, rankHumanVsBeam } from "../research/compare";
import { samePlacement } from "../research/state";
import { ADOPTED_SPEC, runProtocol, type ProtocolResult } from "./phase2";
import { formatSummary, runConfiguredBenchmark, type BenchmarkSummary, type SearchSpec } from "./run";

export const PHASE5_WIDTHS = [4, 8, 12, 16, 24, 32] as const;
export type Phase5Width = (typeof PHASE5_WIDTHS)[number];

/** Live production freeze — only beamWidth varies in this diagnostic. */
export const PHASE5_FROZEN: SearchSpec = {
  ...ADOPTED_SPEC,
  name: "phase5-frozen-w12",
  futureSetup: false,
  tspinSetup: false,
  futureClear: false,
  wellDelta: false,
  holeDelta: false,
  surfaceDelta: false,
};

export function widthSpec(width: number): SearchSpec {
  return { ...PHASE5_FROZEN, name: `beam-w${width}`, beamWidth: width };
}

export function adoptedContext(beamWidth: number): SearchContext {
  return {
    weights: DEFAULT_WEIGHTS,
    depth: 3,
    beamWidth,
    useHold: false,
    holdAtRootOnly: true,
    useGatedHold: true,
    wellReservation: true,
    surfaceOverhang: false,
    mechanicsWeights: DEFAULT_MECHANICS,
    futureSetup: false,
    tspinSetup: false,
    futureClear: false,
    wellDelta: false,
    holeDelta: false,
    surfaceDelta: false,
  };
}

export interface WidthBenchmarkRow {
  width: number;
  protocols: ProtocolResult[];
}

export function runWidthBenchmarks(): WidthBenchmarkRow[] {
  return PHASE5_WIDTHS.map((width) => ({
    width,
    protocols: runProtocol(widthSpec(width)),
  }));
}

export function logWidthBenchmarks(rows: WidthBenchmarkRow[]): void {
  for (const row of rows) {
    for (const p of row.protocols) {
      // eslint-disable-next-line no-console
      console.log(`PHASE5 bench w=${row.width} ${p.protocol}`, formatSummary(p.summary));
    }
  }
}

export interface ExpertWidthRow {
  width: number;
  stats: ReturnType<typeof agreement>;
}

export function runExpertDiagnostics(pieces = 64, seed = 1): ExpertWidthRow[] {
  const steps = playExpertFixture({ seed, pieces });
  return PHASE5_WIDTHS.map((width) => {
    const ctx = adoptedContext(width);
    const ranks = steps.map((step) => rankHumanVsBeam(step, ctx));
    return { width, stats: agreement(ranks) };
  });
}

export function logExpertDiagnostics(rows: ExpertWidthRow[]): void {
  for (const row of rows) {
    const s = row.stats;
    const n = s.compared || 1;
    // eslint-disable-next-line no-console
    console.log(
      `PHASE5 expert w=${row.width} top1=${((100 * s.top1) / n).toFixed(1)}% top3=${((100 * s.top3) / n).toFixed(1)}% top5=${((100 * s.top5) / n).toFixed(1)}% top10=${((100 * s.top10) / n).toFixed(1)}% outside=${((100 * s.outside) / n).toFixed(1)}% avgRank=${s.avgRank.toFixed(2)}`,
    );
  }
}

export interface MoveChangeRow {
  width: number;
  decisions: number;
  differsFrom12: number;
  differRate: number;
  avgRankInW12: number;
  outsideW12: number;
}

export interface DiversityStats {
  samples: number;
  avgRootCandidates: number;
  avgUniquePlacements: number;
  avgUniqueRotXHold: number;
  avgHoldCandidates: number;
  lineClearHist: Record<string, number>;
  nearDuplicateRate: number;
}

const beam = new BeamSearch();

function rankInList(move: Placement | null, candidates: ScoredCandidate[]): number | null {
  if (!move) return null;
  for (let i = 0; i < candidates.length; i++) {
    if (samePlacement(candidates[i]!.placement, move)) return i + 1;
  }
  return null;
}

function rotXHoldKey(p: Placement): string {
  return `${p.hold ? 1 : 0}:${p.rotation}:${p.x}`;
}

export function analyzeRootCandidates(result: SearchResult): {
  candidateCount: number;
  uniquePlacements: number;
  uniqueRotXHold: number;
  holdCount: number;
  lineClearHist: Record<number, number>;
  nearDuplicatePairs: number;
  chosenLineClears: number;
} {
  const cands = result.candidates;
  const placementKeys = new Set(
    cands.map((c) => `${c.placement.hold ? 1 : 0}:${c.placement.rotation}:${c.placement.x}:${c.placement.y}`),
  );
  const rotXHold = new Set(cands.map((c) => rotXHoldKey(c.placement)));
  const holdCount = cands.filter((c) => c.placement.hold).length;
  const lineClearHist: Record<number, number> = {};
  for (const c of cands) {
    const lc = Math.min(4, c.features.linesCleared);
    lineClearHist[lc] = (lineClearHist[lc] ?? 0) + 1;
  }
  const top = result.move;
  const chosenLineClears = top
    ? (cands.find((c) => samePlacement(c.placement, top))?.features.linesCleared ?? 0)
    : 0;
  let nearDup = 0;
  const byRotX = new Map<string, number>();
  for (const c of cands) {
    const k = rotXHoldKey(c.placement);
    nearDup += byRotX.get(k) ?? 0;
    byRotX.set(k, (byRotX.get(k) ?? 0) + 1);
  }
  return {
    candidateCount: cands.length,
    uniquePlacements: placementKeys.size,
    uniqueRotXHold: rotXHold.size,
    holdCount,
    lineClearHist,
    nearDuplicatePairs: nearDup,
    chosenLineClears,
  };
}

/**
 * On the width-12 game trajectory, probe every width at each decision (same board).
 */
export function runSameStateMoveDiagnostic(
  seeds: number[],
  maxPieces: number,
  probeWidths: readonly number[] = PHASE5_WIDTHS,
): { moveChanges: MoveChangeRow[]; diversity: DiversityStats } {
  const diversitySamples: ReturnType<typeof analyzeRootCandidates>[] = [];
  const changeStats = new Map<number, { differs: number; ranks: number[]; outside: number; n: number }>();

  for (const w of probeWidths) {
    if (w !== 12) changeStats.set(w, { differs: 0, ranks: [], outside: 0, n: 0 });
  }

  for (const seed of seeds) {
    const engine = new GameEngine({ randomizer: seededRandomizer(seed) });
    const adapter = new BrowserGameAdapter(engine);
    const core = new TetrisAICore(beam);
    const ctx12 = adoptedContext(12);
    const loop = new ControlLoop(core, ctx12, () => 1);

    engine.start();
    let pieces = 0;
    let lastId = engine.getCurrent()?.id ?? -1;

    for (let tick = 0; tick < maxPieces * 250; tick++) {
      const now = tick * 16;
      engine.tick(now);
      const before = adapter.getState();
      if (before.phase !== "playing" || !before.current) {
        if (engine.getStatus() === "gameover") break;
        continue;
      }

      if (before.current.id !== lastId) {
        if (pieces >= maxPieces) break;

        const results = new Map<number, SearchResult>();
        for (const w of probeWidths) {
          results.set(w, beam.search(before, adoptedContext(w)));
        }
        const r12 = results.get(12)!;
        const move12 = r12.move;

        diversitySamples.push(analyzeRootCandidates(r12));

        for (const w of probeWidths) {
          if (w === 12) continue;
          const moveW = results.get(w)!.move;
          const stat = changeStats.get(w)!;
          stat.n += 1;
          if (!samePlacement(moveW, move12)) stat.differs += 1;
          const rank = rankInList(moveW, r12.candidates);
          if (rank === null) stat.outside += 1;
          else stat.ranks.push(rank);
        }

        pieces += 1;
        lastId = before.current.id;
      }

      loop.tick(now, true, adapter);
      if (engine.getStatus() === "gameover") break;
    }
  }

  const totalPairs = diversitySamples.reduce((s, d) => s + d.nearDuplicatePairs, 0);
  const totalCands = diversitySamples.reduce((s, d) => s + d.candidateCount, 0);
  const lineHist: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0 };

  for (const d of diversitySamples) {
    for (const [lc, count] of Object.entries(d.lineClearHist)) {
      lineHist[lc] = (lineHist[lc] ?? 0) + count;
    }
  }

  const diversity: DiversityStats = {
    samples: diversitySamples.length,
    avgRootCandidates:
      diversitySamples.length === 0
        ? 0
        : diversitySamples.reduce((s, d) => s + d.candidateCount, 0) / diversitySamples.length,
    avgUniquePlacements:
      diversitySamples.length === 0
        ? 0
        : diversitySamples.reduce((s, d) => s + d.uniquePlacements, 0) / diversitySamples.length,
    avgUniqueRotXHold:
      diversitySamples.length === 0
        ? 0
        : diversitySamples.reduce((s, d) => s + d.uniqueRotXHold, 0) / diversitySamples.length,
    avgHoldCandidates:
      diversitySamples.length === 0
        ? 0
        : diversitySamples.reduce((s, d) => s + d.holdCount, 0) / diversitySamples.length,
    lineClearHist: lineHist,
    nearDuplicateRate: totalCands === 0 ? 0 : totalPairs / totalCands,
  };

  const moveChanges: MoveChangeRow[] = [];
  for (const w of probeWidths) {
    if (w === 12) continue;
    const stat = changeStats.get(w)!;
    moveChanges.push({
      width: w,
      decisions: stat.n,
      differsFrom12: stat.differs,
      differRate: stat.n === 0 ? 0 : stat.differs / stat.n,
      avgRankInW12: stat.ranks.length === 0 ? 0 : stat.ranks.reduce((a, b) => a + b, 0) / stat.ranks.length,
      outsideW12: stat.outside,
    });
  }

  return { moveChanges, diversity };
}

export function logMoveChanges(rows: MoveChangeRow[]): void {
  for (const row of rows) {
    // eslint-disable-next-line no-console
    console.log(
      `PHASE5 move vs w12 w=${row.width} differ=${(100 * row.differRate).toFixed(1)}% avgRankIn12=${row.avgRankInW12.toFixed(2)} outside=${row.outsideW12}/${row.decisions}`,
    );
  }
}

export function logDiversity(d: DiversityStats): void {
  // eslint-disable-next-line no-console
  console.log(
    `PHASE5 diversity w=12 samples=${d.samples} avgCandidates=${d.avgRootCandidates.toFixed(1)} uniqueRotXHold=${d.avgUniqueRotXHold.toFixed(1)} holdCands=${d.avgHoldCandidates.toFixed(2)} nearDupRate=${(100 * d.nearDuplicateRate).toFixed(1)}% lineClear=${JSON.stringify(d.lineClearHist)}`,
  );
}

export interface Phase5Classification {
  case: "A" | "B" | "C" | "D" | "mixed";
  summary: string;
}

export function classifyWidthSensitivity(
  benchmarks: WidthBenchmarkRow[],
  expert: ExpertWidthRow[],
): Phase5Classification {
  const w12 = benchmarks.find((r) => r.width === 12);
  const w16 = benchmarks.find((r) => r.width === 16);
  const w32 = benchmarks.find((r) => r.width === 32);
  if (!w12) return { case: "mixed", summary: "missing width 12 row" };

  const long12 = w12.protocols.find((p) => p.protocol === "10x100")!.summary;
  const long16 = w16?.protocols.find((p) => p.protocol === "10x100")?.summary;
  const long32 = w32?.protocols.find((p) => p.protocol === "10x100")?.summary;
  const short12 = w12.protocols.find((p) => p.protocol === "5x40")!.summary;
  const short32 = w32?.protocols.find((p) => p.protocol === "5x40")?.summary;

  const linesUp =
    long16 &&
    long32 &&
    long16.averageLines > long12.averageLines + 1e-9 &&
    long32.averageLines >= long16.averageLines - 1e-9;
  const scoreUp =
    long16 &&
    long32 &&
    long16.averageScore > long12.averageScore + 1e-9 &&
    long32.averageScore >= long16.averageScore - 1e-9;

  const saturated =
    long16 &&
    Math.abs(long16.averageLines - long12.averageLines) < 0.05 &&
    Math.abs(long16.averageScore - long12.averageScore) < 50;

  const expert12 = expert.find((e) => e.width === 12)?.stats;
  const expert32 = expert.find((e) => e.width === 32)?.stats;
  const expertUp =
    expert12 &&
    expert32 &&
    expert32.top1 > expert12.top1 &&
    (!long32 || long32.averageScore <= long12.averageScore + 1e-9);

  const shortGainLongLoss =
    short32 &&
    long32 &&
    short32.averageLines > short12.averageLines + 1e-9 &&
    long32.averageLines < long12.averageLines - 1e-9;

  if (shortGainLongLoss) {
    return { case: "D", summary: "5×40 improved at wider width but 10×100 lines fell — reject wider beam." };
  }
  if (expertUp) {
    return { case: "C", summary: "Expert top-1 rose with width but 10×100 games did not improve — diagnostic only." };
  }
  if (linesUp && scoreUp) {
    return {
      case: "A",
      summary: "Wider beam improved 10×100 lines and score — recommend narrowly scoped width-16 experiment (do not auto-adopt).",
    };
  }
  if (saturated) {
    return { case: "B", summary: "12→16→32 shows little real-game gain — beam width is not the primary bottleneck." };
  }
  return { case: "mixed", summary: "No clear Case A/B/C/D — see tables." };
}

export { runProtocol, formatSummary, runConfiguredBenchmark };
export type { ProtocolResult, BenchmarkSummary };
