import type { GameAction, GameEngine } from "../game";
import type { Placement, SearchDepth, SearchResult } from "./types";
import type { EvalWeights } from "./types";
import { findBestMove } from "./search";
import { DEFAULT_WEIGHTS } from "./weights";

export interface AIPlayerOptions {
  weights?: EvalWeights;
  depth?: SearchDepth;
  actionDelayMs?: number;
  onResult?: (result: SearchResult) => void;
}

type Phase = "idle" | "rotate" | "shift" | "drop";

export class AIPlayer {
  weights: EvalWeights;
  depth: SearchDepth;
  actionDelayMs: number;
  onResult?: (result: SearchResult) => void;

  private enabled = false;
  private lastPieceId = -1;
  private target: Placement | null = null;
  private phase: Phase = "idle";
  private accum = 0;
  private lastTime = 0;

  constructor(options: AIPlayerOptions = {}) {
    this.weights = options.weights ?? { ...DEFAULT_WEIGHTS };
    this.depth = options.depth ?? 2;
    this.actionDelayMs = options.actionDelayMs ?? 55;
    this.onResult = options.onResult;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.resetPlan();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  resetPlan(): void {
    this.lastPieceId = -1;
    this.target = null;
    this.phase = "idle";
    this.accum = 0;
    this.lastTime = 0;
  }

  tick(now: number, engine: GameEngine): void {
    if (!this.enabled || engine.getStatus() !== "playing") {
      this.lastTime = now;
      return;
    }

    const current = engine.getCurrent();
    if (!current) {
      this.lastTime = now;
      return;
    }

    if (current.id !== this.lastPieceId) {
      const result = findBestMove(
        engine.getBoard(),
        current.type,
        engine.getNext(),
        this.weights,
        this.depth,
      );
      this.lastPieceId = current.id;
      this.target = result.move;
      this.phase = result.move ? "rotate" : "idle";
      this.accum = 0;
      this.onResult?.(result);
    }

    if (!this.target) {
      this.lastTime = now;
      return;
    }

    if (this.lastTime === 0) {
      this.lastTime = now;
      return;
    }

    this.accum += now - this.lastTime;
    this.lastTime = now;

    if (this.accum < this.actionDelayMs || this.phase === "idle") return;
    this.accum = 0;
    const action = this.nextAction(engine);
    if (action) engine.input(action);
  }

  private nextAction(engine: GameEngine): GameAction | null {
    const piece = engine.getCurrent();
    const target = this.target;
    if (!piece || !target) {
      this.phase = "idle";
      return null;
    }

    if (this.phase === "rotate") {
      if (piece.rotation !== target.rotation) return "rotateCW";
      this.phase = "shift";
    }

    if (this.phase === "shift") {
      if (piece.x < target.x) return "right";
      if (piece.x > target.x) return "left";
      this.phase = "drop";
    }

    if (this.phase === "drop") {
      this.phase = "idle";
      return "hardDrop";
    }

    return null;
  }
}
