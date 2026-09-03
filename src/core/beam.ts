import { occupiedCount } from "../game/board";
import { placeAndClear } from "../game/lineClear";
import type { Board, TetrominoType } from "../game/types";
import { generateMoves, generateMovesWithSpins } from "../ai/moveGenerator";
import { evaluateBoard, mechanicsScore } from "../ai/evaluator";
import { shouldExploreHold } from "../ai/holdGate";
import { overhangScore, wellReservationScore } from "../ai/structure";
import {
  ZERO_FUTURE,
  computeFutureFeatures,
  emptyActivations,
  scoreFuture,
  type FutureActivations,
  type FutureWeights,
} from "../ai/future";
import type { EvalWeights, Placement, ScoredCandidate, SearchResult } from "../ai/types";
import { DEFAULT_MECHANICS, ZERO_MECHANICS } from "../ai/weights";
import type { MechanicsWeights } from "../ai/weights";
import { detectTSpin } from "./mechanics/tspin";
import { applyHold, nextBackToBack, nextCombo } from "./mechanics/hold";
import type { SearchAlgorithm, SearchContext } from "./search";
import type { TetrisGameState } from "./state";
import { IdentityStrategy } from "./strategy";

export interface BeamConfig {
  depth: number;
  beamWidth: number;
  useHold: boolean;
  useGatedHold: boolean;
  wellReservation: boolean;
  surfaceOverhang: boolean;
  futureSetup: boolean;
  tspinSetup: boolean;
  futureClear: boolean;
  futureWeights: FutureWeights;
  useSpins: boolean;
  holdAtRootOnly: boolean;
  mechanics: MechanicsWeights;
}

export const DEFAULT_BEAM: BeamConfig = {
  depth: 3,
  beamWidth: 12,
  useHold: false,
  useGatedHold: true,
  wellReservation: true,
  surfaceOverhang: false,
  futureSetup: false,
  tspinSetup: false,
  futureClear: false,
  futureWeights: ZERO_FUTURE,
  useSpins: true,
  holdAtRootOnly: true,
  mechanics: DEFAULT_MECHANICS,
};

interface Node {
  board: Board;
  current: TetrominoType | null;
  nextQueue: TetrominoType[];
  hold: TetrominoType | null;
  canHold: boolean;
  combo: number;
  backToBack: boolean;
  pathLines: number;
  pathMechanics: number;
  score: number;
  rootMove: Placement;
  features: ScoredCandidate["features"];
}

export class BeamSearch implements SearchAlgorithm {
  readonly name = "beam";
  config: BeamConfig;

  constructor(config: Partial<BeamConfig> = {}) {
    this.config = { ...DEFAULT_BEAM, ...config };
  }

  search(state: TetrisGameState, context: SearchContext): SearchResult {
    const started = nowMs();
    if (!state.current) return emptyResult(context.depth);
    const cfg: BeamConfig = {
      depth: Math.max(1, context.depth || this.config.depth),
      beamWidth: Math.max(1, context.beamWidth ?? this.config.beamWidth),
      useHold: context.useHold ?? this.config.useHold,
      useGatedHold: context.useGatedHold ?? this.config.useGatedHold,
      wellReservation: context.wellReservation ?? this.config.wellReservation,
      surfaceOverhang: context.surfaceOverhang ?? this.config.surfaceOverhang,
      futureSetup: context.futureSetup ?? this.config.futureSetup,
      tspinSetup: context.tspinSetup ?? this.config.tspinSetup,
      futureClear: context.futureClear ?? this.config.futureClear,
      futureWeights: context.futureWeights ?? this.config.futureWeights,
      useSpins: this.config.useSpins,
      holdAtRootOnly: context.holdAtRootOnly ?? this.config.holdAtRootOnly,
      mechanics: context.mechanicsWeights ?? this.config.mechanics ?? ZERO_MECHANICS,
    };
    const weights = context.weights;
    let nodes = 0;
    const activations = emptyActivations();

    const origin: Node = {
      board: state.board,
      current: state.current.type,
      nextQueue: state.nextPieces.slice(),
      hold: state.holdPiece,
      canHold: state.canHold,
      combo: state.combo,
      backToBack: state.backToBack,
      pathLines: 0,
      pathMechanics: 0,
      score: 0,
      rootMove: { rotation: 0, x: 0, y: 0 },
      features: evaluateBoard(state.board, 0, weights).features,
    };

    const first = expand(origin, cfg, weights, true, activations);
    nodes += first.nodes;
    const firstSorted = first.children.sort((a, b) => b.score - a.score);
    // Keep every root placement for the first deeper expand so depth 2
    // matches 2-ply; prune only after that.
    let beam = firstSorted;

    for (let depth = 1; depth < cfg.depth; depth++) {
      const next: Node[] = [];
      const seen = new Set<string>();
      for (const node of beam) {
        const expanded = expand(node, cfg, weights, false, activations);
        nodes += expanded.nodes;
        for (const child of expanded.children) {
          const key = stateKey(child);
          if (seen.has(key)) continue;
          seen.add(key);
          next.push(child);
        }
      }
      if (next.length === 0) break;
      next.sort((a, b) => b.score - a.score);
      beam = next.slice(0, cfg.beamWidth);
    }

    const pool = beam.length ? beam : first.children;
    const bestLeaf = pool.slice().sort((a, b) => b.score - a.score)[0];
    const rootScores = new Map<string, number>();
    for (const leaf of pool) {
      const key = placementKey(leaf.rootMove);
      const prev = rootScores.get(key);
      if (prev === undefined || leaf.score > prev) rootScores.set(key, leaf.score);
    }
    const candidates: ScoredCandidate[] = first.children.map((child) => ({
      placement: child.rootMove,
      score: rootScores.get(placementKey(child.rootMove)) ?? child.score,
      features: child.features,
    }));
    candidates.sort((a, b) => b.score - a.score);

    const raw: SearchResult = {
      move: bestLeaf?.rootMove ?? null,
      bestScore: bestLeaf?.score ?? Number.NEGATIVE_INFINITY,
      candidates,
      elapsedMs: nowMs() - started,
      depth: cfg.depth,
      nodes,
      activations,
    };
    return (context.strategy ?? new IdentityStrategy()).rerank(raw, state);
  }
}

function expand(
  node: Node,
  cfg: BeamConfig,
  weights: EvalWeights,
  isRoot: boolean,
  activations: FutureActivations,
): { children: Node[]; nodes: number } {
  if (!node.current) return { children: [], nodes: 0 };
  const children: Node[] = [];
  let nodes = 0;
  const generate = cfg.useSpins ? generateMovesWithSpins : generateMoves;

  const pushPlacements = (
    type: TetrominoType,
    hold: boolean,
    holdPiece: TetrominoType | null,
    nextQueue: TetrominoType[],
  ) => {
    for (const move of generate(node.board, type)) {
      nodes += 1;
      const tSpin = detectTSpin(node.board, move.piece, Boolean(move.placement.spinPre));
      const placed = placeAndClear(node.board, move.piece);
      const comboAfter = nextCombo(node.combo, placed.cleared);
      const b2bAfter = nextBackToBack(node.backToBack, placed.cleared, tSpin);
      const pathLines = node.pathLines + placed.cleared;
      const extra = mechanicsScore({
        tSpin,
        linesCleared: placed.cleared,
        comboAfter,
        backToBackAfter: b2bAfter,
        perfectClear: occupiedCount(placed.board) === 0,
        holdType: holdPiece,
        usedHold: hold,
        weights: cfg.mechanics,
      });
      const pathMechanics = node.pathMechanics + extra;
      const boardEval = evaluateBoard(placed.board, pathLines, weights);
      const [nextCurrent, ...rest] = nextQueue;
      let structure = 0;
      if (cfg.wellReservation) {
        structure += wellReservationScore(placed.board, holdPiece, nextCurrent ?? null, rest);
      }
      if (cfg.surfaceOverhang) {
        structure += overhangScore(placed.board);
      }
      if (cfg.futureSetup || cfg.tspinSetup || cfg.futureClear) {
        const future = scoreFuture(computeFutureFeatures(placed.board), cfg.futureWeights, {
          setup: cfg.futureSetup,
          tspin: cfg.tspinSetup,
          clear: cfg.futureClear,
        });
        structure += future.score;
        activations.setup += future.activations.setup;
        activations.tspin += future.activations.tspin;
        activations.clear += future.activations.clear;
      }
      children.push({
        board: placed.board,
        current: nextCurrent ?? null,
        nextQueue: rest,
        hold: holdPiece,
        canHold: true,
        combo: comboAfter,
        backToBack: b2bAfter,
        pathLines,
        pathMechanics,
        score: boardEval.score + pathMechanics + structure,
        rootMove: isRoot ? { ...move.placement, hold } : node.rootMove,
        features: boardEval.features,
      });
    }
  };

  pushPlacements(node.current, false, node.hold, node.nextQueue);

  const gated =
    cfg.useGatedHold &&
    shouldExploreHold({
      board: node.board,
      current: node.current,
      hold: node.hold,
      nextQueue: node.nextQueue,
      canHold: node.canHold,
    });
  if ((cfg.useHold || gated) && node.canHold && (isRoot || !cfg.holdAtRootOnly)) {
    const held = applyHold({
      current: node.current,
      hold: node.hold,
      nextQueue: node.nextQueue,
      canHold: true,
    });
    if (held.ok && held.current) {
      pushPlacements(held.current, true, held.hold, held.nextQueue);
    }
  }

  return { children, nodes };
}

function placementKey(move: Placement): string {
  return `${move.hold ? 1 : 0}:${move.rotation}:${move.x}:${move.y}:${move.spinPre ? 1 : 0}`;
}

function stateKey(node: Node): string {
  let bits = "";
  for (let x = 0; x < 10; x++) {
    let col = 0;
    for (let y = 0; y < 20; y++) {
      if (node.board[y][x] !== 0) col |= 1 << y;
    }
    bits += col.toString(36);
  }
  return `${bits}|${node.current}|${node.hold}|${node.canHold}|${node.combo}|${Number(node.backToBack)}`;
}

function emptyResult(depth: number): SearchResult {
  return {
    move: null,
    bestScore: Number.NEGATIVE_INFINITY,
    candidates: [],
    elapsedMs: 0,
    depth,
    nodes: 0,
    activations: emptyActivations(),
  };
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
