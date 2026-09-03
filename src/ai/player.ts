import { DEFAULT_WEIGHTS, DEFAULT_MECHANICS, ZERO_MECHANICS } from "./weights";
import type { EvalWeights, SearchResult } from "./types";
import type { MechanicsWeights } from "./weights";
import type { TetrisGameAdapter } from "../core/adapters";
import { ControlLoop } from "../core/loop";
import { TetrisAICore } from "../core/ai";
import { PlySearch, BeamSearch } from "../core/search";
import type { SearchAlgorithm, SearchContext } from "../core/search";
import { IdentityStrategy } from "../core/strategy";
import { DEFAULT_BEAM } from "../core/beam";

export interface AIPlayerOptions {
  weights?: EvalWeights;
  depth?: number;
  actionDelayMs?: number;
  onResult?: (result: SearchResult) => void;
  algorithm?: "ply" | "beam";
  beamWidth?: number;
  useHold?: boolean;
  holdAtRootOnly?: boolean;
  mechanicsWeights?: MechanicsWeights;
  useGatedHold?: boolean;
  wellReservation?: boolean;
  surfaceOverhang?: boolean;
}

export class AIPlayer {
  weights: EvalWeights;
  depth: number;
  actionDelayMs: number;
  onResult?: (result: SearchResult) => void;
  algorithm: "ply" | "beam";
  beamWidth: number;
  useHold: boolean;
  holdAtRootOnly: boolean;
  mechanicsWeights: MechanicsWeights;
  useGatedHold: boolean;
  wellReservation: boolean;
  surfaceOverhang: boolean;

  private enabled = false;
  private readonly context: SearchContext;
  private readonly core: TetrisAICore;
  private readonly loop: ControlLoop;

  constructor(options: AIPlayerOptions = {}) {
    this.weights = options.weights ?? { ...DEFAULT_WEIGHTS };
    this.algorithm = options.algorithm ?? "ply";
    this.depth = options.depth ?? (this.algorithm === "beam" ? DEFAULT_BEAM.depth : 2);
    this.actionDelayMs = options.actionDelayMs ?? 55;
    this.onResult = options.onResult;
    this.beamWidth = options.beamWidth ?? DEFAULT_BEAM.beamWidth;
    this.useHold = options.useHold ?? (this.algorithm === "beam" ? DEFAULT_BEAM.useHold : false);
    this.holdAtRootOnly = options.holdAtRootOnly ?? true;
    this.mechanicsWeights =
      options.mechanicsWeights ?? (this.algorithm === "beam" ? DEFAULT_MECHANICS : { ...ZERO_MECHANICS });
    this.useGatedHold = options.useGatedHold ?? (this.algorithm === "beam" ? DEFAULT_BEAM.useGatedHold : false);
    this.wellReservation =
      options.wellReservation ?? (this.algorithm === "beam" ? DEFAULT_BEAM.wellReservation : false);
    this.surfaceOverhang =
      options.surfaceOverhang ?? (this.algorithm === "beam" ? DEFAULT_BEAM.surfaceOverhang : false);
    this.context = {
      weights: this.weights,
      depth: this.depth,
      strategy: new IdentityStrategy(),
      beamWidth: this.beamWidth,
      useHold: this.useHold,
      holdAtRootOnly: this.holdAtRootOnly,
      mechanicsWeights: this.mechanicsWeights,
      useGatedHold: this.useGatedHold,
      wellReservation: this.wellReservation,
      surfaceOverhang: this.surfaceOverhang,
    };
    this.core = new TetrisAICore(createSearch(this.algorithm));
    this.loop = new ControlLoop(
      this.core,
      this.context,
      () => this.actionDelayMs,
      (result) => this.onResult?.(result),
    );
  }

  setAlgorithm(algorithm: "ply" | "beam"): void {
    if (this.algorithm === algorithm) return;
    this.algorithm = algorithm;
    this.core.setSearch(createSearch(algorithm));
    this.resetPlan();
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
    this.context.beamWidth = this.beamWidth;
    this.context.useHold = this.useHold;
    this.context.holdAtRootOnly = this.holdAtRootOnly;
    this.context.mechanicsWeights = this.mechanicsWeights;
    this.context.useGatedHold = this.useGatedHold;
    this.context.wellReservation = this.wellReservation;
    this.context.surfaceOverhang = this.surfaceOverhang;
    this.loop.tick(now, this.enabled, adapter);
  }
}

function createSearch(algorithm: "ply" | "beam"): SearchAlgorithm {
  return algorithm === "beam" ? new BeamSearch() : new PlySearch();
}
