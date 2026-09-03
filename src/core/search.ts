import { findBestMove } from "../ai/search";
import type { EvalWeights, SearchDepth, SearchResult } from "../ai/types";
import type { TetrisGameState } from "./state";
import type { Strategy } from "./strategy";
import { IdentityStrategy } from "./strategy";

export interface SearchContext {
  weights: EvalWeights;
  depth: SearchDepth;
  strategy?: Strategy;
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
    const raw = findBestMove(
      state.board,
      state.current.type,
      state.nextPieces[0] ?? null,
      context.weights,
      context.depth,
    );
    const strategy = context.strategy ?? new IdentityStrategy();
    return strategy.rerank(raw, state);
  }
}

/** Reserved for a future beam / multi-ply implementation. */
export class BeamSearch implements SearchAlgorithm {
  readonly name = "beam";

  search(state: TetrisGameState, context: SearchContext): SearchResult {
    return new PlySearch().search(state, context);
  }
}
