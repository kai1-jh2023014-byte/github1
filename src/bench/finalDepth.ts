import { BrowserGameAdapter } from "../adapters/browser";
import { BeamSearch } from "../core/beam";
import { ControlLoop } from "../core/loop";
import { TetrisAICore } from "../core/ai";
import { DEFAULT_WEIGHTS, DEFAULT_MECHANICS } from "../ai/weights";
import type { Placement } from "../ai/types";
import type { SearchContext } from "../core/search";
import { samePlacement } from "../research/state";
import { PHASE5_FROZEN } from "./phase5";
import { SEEDS40, runProtocol, type ProtocolResult } from "./phase2";
import { formatSummary, type SearchSpec } from "./run";
import { GameEngine } from "../game/engine";
import { seededRandomizer } from "../game/seeded";

/** Final depth experiment: only depth varies; width/eval/Hold frozen. */
export const FINAL_DEPTHS = [1, 2, 3, 4] as const;
export type FinalDepth = (typeof FINAL_DEPTHS)[number];

/** Single source of truth for the frozen production search spec (depth 3). */
export const PRODUCTION_FROZEN: SearchSpec = {
  ...PHASE5_FROZEN,
  name: "production-frozen-d3-w12",
  depth: 3,
  beamWidth: 12,
};

export function depthSpec(depth: number): SearchSpec {
  return { ...PRODUCTION_FROZEN, name: `beam-d${depth}`, depth };
}

export function adoptedContext(depth: number): SearchContext {
  return {
    weights: DEFAULT_WEIGHTS,
    depth,
    beamWidth: 12,
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

export interface DepthBenchmarkRow {
  depth: number;
  protocols: ProtocolResult[];
}

export function runDepthBenchmarks(): DepthBenchmarkRow[] {
  return FINAL_DEPTHS.map((depth) => ({
    depth,
    protocols: runProtocol(depthSpec(depth)),
  }));
}

export function logDepthBenchmarks(rows: DepthBenchmarkRow[]): void {
  for (const row of rows) {
    for (const p of row.protocols) {
      // eslint-disable-next-line no-console
      console.log(`FINAL bench d=${row.depth} ${p.protocol}`, formatSummary(p.summary));
    }
  }
}

export interface DepthChangeExample {
  seed: number;
  pieceIndex: number;
  depth3: Placement | null;
  depth4: Placement | null;
}

export interface DepthChangeReport {
  decisions: number;
  differs: number;
  differRate: number;
  examples: DepthChangeExample[];
}

const beam = new BeamSearch();

function placementLabel(p: Placement | null): string {
  if (!p) return "null";
  return `hold=${p.hold ? 1 : 0} rot=${p.rotation} x=${p.x}`;
}

/**
 * Same-state probe on the depth-3 game trajectory: what would depth 4 pick?
 */
export function runDepth34ChangeDiagnostic(
  seeds: number[] = SEEDS40,
  maxPieces = 40,
  maxExamples = 5,
): DepthChangeReport {
  const examples: DepthChangeExample[] = [];
  let decisions = 0;
  let differs = 0;

  for (const seed of seeds) {
    const engine = new GameEngine({ randomizer: seededRandomizer(seed) });
    const adapter = new BrowserGameAdapter(engine);
    const loop = new ControlLoop(new TetrisAICore(beam), adoptedContext(3), () => 1);

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

        const r3 = beam.search(before, adoptedContext(3));
        const r4 = beam.search(before, adoptedContext(4));
        decisions += 1;
        if (!samePlacement(r3.move, r4.move)) {
          differs += 1;
          if (examples.length < maxExamples) {
            examples.push({
              seed,
              pieceIndex: pieces,
              depth3: r3.move,
              depth4: r4.move,
            });
          }
        }

        pieces += 1;
        lastId = before.current.id;
      }

      loop.tick(now, true, adapter);
      if (engine.getStatus() === "gameover") break;
    }
  }

  return {
    decisions,
    differs,
    differRate: decisions === 0 ? 0 : differs / decisions,
    examples,
  };
}

export function logDepthChange(report: DepthChangeReport): void {
  // eslint-disable-next-line no-console
  console.log(
    `FINAL d3→d4 differ=${(100 * report.differRate).toFixed(1)}% (${report.differs}/${report.decisions})`,
  );
  for (const ex of report.examples) {
    // eslint-disable-next-line no-console
    console.log(
      `FINAL d3→d4 example seed=${ex.seed} piece=${ex.pieceIndex} d3=${placementLabel(ex.depth3)} d4=${placementLabel(ex.depth4)}`,
    );
  }
}

export interface DepthAdoptionVerdict {
  adopt: boolean;
  reasons: string[];
}

export function evaluateDepth4Adoption(rows: DepthBenchmarkRow[]): DepthAdoptionVerdict {
  const d3 = rows.find((r) => r.depth === 3);
  const d4 = rows.find((r) => r.depth === 4);
  const reasons: string[] = [];
  if (!d3 || !d4) {
    return { adopt: false, reasons: ["missing depth 3 or 4 benchmark row"] };
  }

  const long3 = d3.protocols.find((p) => p.protocol === "10x100")!.summary;
  const long4 = d4.protocols.find((p) => p.protocol === "10x100")!.summary;
  const mid3 = d3.protocols.find((p) => p.protocol === "5x100")!.summary;
  const mid4 = d4.protocols.find((p) => p.protocol === "5x100")!.summary;
  const short3 = d3.protocols.find((p) => p.protocol === "5x40")!.summary;
  const short4 = d4.protocols.find((p) => p.protocol === "5x40")!.summary;

  const linesUp = long4.averageLines > long3.averageLines + 1e-9;
  const scoreUp = long4.averageScore > long3.averageScore + 1e-9;

  if (long4.averageLines + 1e-9 < long3.averageLines) {
    reasons.push(
      `10x100 lines regression ${long4.averageLines.toFixed(2)} < ${long3.averageLines.toFixed(2)}`,
    );
  }
  if (long4.averageScore + 1e-9 < long3.averageScore) {
    reasons.push(
      `10x100 score regression ${long4.averageScore.toFixed(1)} < ${long3.averageScore.toFixed(1)}`,
    );
  }
  if (!linesUp && !scoreUp) {
    reasons.push("10x100 did not improve lines or score");
  }

  if (long4.gameOverRate > long3.gameOverRate + 1e-9) {
    reasons.push(`10x100 GameOver worsened ${long4.gameOverRate} > ${long3.gameOverRate}`);
  }
  for (const p of d4.protocols) {
    if (p.summary.p95DecisionMs >= 80) {
      reasons.push(`${p.protocol} p95 ${p.summary.p95DecisionMs.toFixed(1)} >= 80ms`);
    }
  }

  const longRegressed =
    long4.averageLines + 1e-9 < long3.averageLines || long4.averageScore + 1e-9 < long3.averageScore;
  const shortImproved =
    short4.averageLines > short3.averageLines + 1e-9 || short4.averageScore > short3.averageScore + 1e-9;
  if (shortImproved && longRegressed && !(linesUp || scoreUp)) {
    reasons.push("5x40 improved but 10x100 did not — reject");
  }

  if (mid4.averageLines + 1e-9 < mid3.averageLines) {
    reasons.push(`5x100 lines regression ${mid4.averageLines.toFixed(2)} < ${mid3.averageLines.toFixed(2)}`);
  }
  if (mid4.averageScore + 1e-9 < mid3.averageScore) {
    reasons.push(`5x100 score regression ${mid4.averageScore.toFixed(1)} < ${mid3.averageScore.toFixed(1)}`);
  }

  return {
    adopt: reasons.length === 0 && linesUp && scoreUp,
    reasons,
  };
}

export { runProtocol, formatSummary };
