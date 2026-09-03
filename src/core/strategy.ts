import type { SearchResult } from "../ai/types";
import type { TetrisGameState } from "./state";

export interface Strategy {
  readonly name: string;
  rerank(result: SearchResult, state: TetrisGameState): SearchResult;
}

export class IdentityStrategy implements Strategy {
  readonly name = "identity";

  rerank(result: SearchResult): SearchResult {
    return result;
  }
}
