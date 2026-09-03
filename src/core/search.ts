import { findBestMove } from "../ai/search";
import type { EvalWeights, SearchResult } from "../ai/types";
import type { MechanicsWeights } from "../ai/weights";
import type { TetrisGameState } from "./state";
import type { Strategy } from "./strategy";
import { IdentityStrategy } from "./strategy";
import { BeamSearch } from "./beam";

export interface SearchContext {
  weights: EvalWeights;
  depth: number;
  strategy?: Strategy;
  beamWidth?: number;
  useHold?: boolean;
  holdAtRootOnly?: boolean;
  mechanicsWeights?: MechanicsWeights;
}

export interface SearchAlgorithm {
  readonly name: string;
  search(state: TetrisGameState, context: SearchContext): SearchResult;
}

export class PlySearch implements SearchAlgorithm {
  readonly name = "ply";

  search(state: TetrisGameState, context: SearchContext): SearchResult {
    if (!state.current) {
      return {
        move: null,
        bestScore: Number.NEGATIVE_INFINITY,
        candidates: [],
        elapsedMs: 0,
        depth: context.depth,
        nodes: 0,
      };
    }
    const ply = context.depth >= 2 ? 2 : 1;
    const raw = findBestMove(
      state.board,
      state.current.type,
      state.nextPieces[0] ?? null,
      context.weights,
      ply,
    );
    const strategy = context.strategy ?? new IdentityStrategy();
    return strategy.rerank(raw, state);
  }
}

export { BeamSearch };
