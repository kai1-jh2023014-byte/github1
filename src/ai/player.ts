import { DEFAULT_WEIGHTS } from "./weights";
import type { EvalWeights, SearchDepth, SearchResult } from "./types";
import type { TetrisGameAdapter } from "../core/adapters";
import { ControlLoop } from "../core/loop";
import { TetrisAICore } from "../core/ai";
import { PlySearch } from "../core/search";
import type { SearchContext } from "../core/search";
import { IdentityStrategy } from "../core/strategy";

export interface AIPlayerOptions {
  weights?: EvalWeights;
  depth?: SearchDepth;
  actionDelayMs?: number;
  onResult?: (result: SearchResult) => void;
}

export class AIPlayer {
  weights: EvalWeights;
  depth: SearchDepth;
  actionDelayMs: number;
  onResult?: (result: SearchResult) => void;

  private enabled = false;
  private readonly context: SearchContext;
  private readonly loop: ControlLoop;

  constructor(options: AIPlayerOptions = {}) {
    this.weights = options.weights ?? { ...DEFAULT_WEIGHTS };
    this.depth = options.depth ?? 2;
    this.actionDelayMs = options.actionDelayMs ?? 55;
    this.onResult = options.onResult;
    this.context = {
      weights: this.weights,
      depth: this.depth,
      strategy: new IdentityStrategy(),
    };
    this.loop = new ControlLoop(
      new TetrisAICore(new PlySearch()),
      this.context,
      () => this.actionDelayMs,
      (result) => this.onResult?.(result),
    );
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.resetPlan();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  resetPlan(): void {
    this.loop.reset();
  }

  tick(now: number, adapter: TetrisGameAdapter): void {
    this.context.weights = this.weights;
    this.context.depth = this.depth;
    this.loop.tick(now, this.enabled, adapter);
  }
}
