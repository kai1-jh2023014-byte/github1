import type { Placement, SearchResult } from "../ai/types";
import type { TetrisAction } from "./actions";
import { planActions } from "./planner";
import type { SearchAlgorithm, SearchContext } from "./search";
import { PlySearch } from "./search";
import type { TetrisGameState } from "./state";

export interface PlannedMove {
  target: Placement | null;
  actions: TetrisAction[];
  search: SearchResult;
}

export class TetrisAICore {
  constructor(
    private readonly searchAlgo: SearchAlgorithm = new PlySearch(),
  ) {}

  think(state: TetrisGameState, context: SearchContext): SearchResult {
    return this.searchAlgo.search(state, context);
  }

  plan(state: TetrisGameState, context: SearchContext): PlannedMove {
    const search = this.think(state, context);
    if (!state.current || !search.move) {
      return { target: null, actions: [], search };
    }
    return {
      target: search.move,
      actions: planActions(state.current, search.move),
      search,
    };
  }
}
