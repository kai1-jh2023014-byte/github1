import type { Placement, SearchResult } from "../ai/types";
import type { TetrisGameAdapter } from "./adapters";
import type { PlannedMove } from "./ai";
import { TetrisAICore } from "./ai";
import { nextLiveAction } from "./planner";
import type { SearchContext } from "./search";
import type { TetrisGameState } from "./state";

export interface LoopStep {
  observed: TetrisGameState;
  planned: PlannedMove | null;
  acted: boolean;
}

/**
 * Observe → Think → Plan → Act closed loop.
 * Think/Plan run once per new falling piece. Act emits one input per tick
 * using live state, matching the existing browser AI pacing.
 */
export class ControlLoop {
  private lastPieceId = -1;
  private target: Placement | null = null;
  private lastResult: SearchResult | null = null;
  private accum = 0;
  private lastTime = 0;

  constructor(
    private readonly core: TetrisAICore,
    private readonly context: SearchContext,
    private readonly getDelayMs: () => number,
    private readonly onResult?: (result: SearchResult) => void,
  ) {}

  reset(): void {
    this.lastPieceId = -1;
    this.target = null;
    this.lastResult = null;
    this.accum = 0;
    this.lastTime = 0;
  }

  getLastResult(): SearchResult | null {
    return this.lastResult;
  }

  tick(now: number, enabled: boolean, adapter: TetrisGameAdapter): LoopStep {
    const observed = adapter.getState();
    if (!enabled || observed.phase !== "playing" || !observed.current) {
      this.lastTime = now;
      return { observed, planned: null, acted: false };
    }

    let planned: PlannedMove | null = null;
    if (observed.current.id !== this.lastPieceId) {
      planned = this.core.plan(observed, this.context);
      this.lastPieceId = observed.current.id;
      this.target = planned.target;
      this.lastResult = planned.search;
      this.accum = 0;
      this.onResult?.(planned.search);
    }

    if (!this.target) {
      this.lastTime = now;
      return { observed, planned, acted: false };
    }

    if (this.lastTime === 0) {
      this.lastTime = now;
      return { observed, planned, acted: false };
    }

    this.accum += now - this.lastTime;
    this.lastTime = now;
    if (this.accum < this.getDelayMs()) {
      return { observed, planned, acted: false };
    }
    this.accum = 0;

    const live = adapter.getState().current;
    if (!live || !this.target) return { observed, planned, acted: false };
    const action = nextLiveAction(live, this.target);
    if (!action) return { observed, planned, acted: false };
    if (action.type === "hardDrop" || action.type === "hold") this.target = null;
    adapter.press(action);
    return { observed, planned, acted: true };
  }
}
