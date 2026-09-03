import { seededRandomizer } from "../game/seeded";
import type { TetrominoType } from "../game/types";
import { chooseExpertAction } from "./expert";
import { applyAction, cloneState, emptyPlayingState } from "./state";
import type { Confidence, ReplayStep } from "./types";

const HIGH: Confidence = {
  board: 1,
  current: 1,
  next: 1,
  hold: 1,
  action: 1,
};

export function dealPieces(seed: number, count: number): TetrominoType[] {
  const rng = seededRandomizer(seed);
  const pieces: TetrominoType[] = [];
  while (pieces.length < count) pieces.push(rng.next());
  return pieces;
}

export function playExpertFixture(options: {
  seed: number;
  pieces: number;
}): ReplayStep[] {
  const queue = dealPieces(options.seed, options.pieces + 8);
  let state = emptyPlayingState(queue);
  const steps: ReplayStep[] = [];
  for (let i = 0; i < options.pieces; i++) {
    if (!state.current || state.phase !== "playing") break;
    const human = chooseExpertAction(state);
    if (!human) break;
    const applied = applyAction(state, human);
    if (!applied) break;
    steps.push({
      index: i,
      timestamp: i,
      stateBefore: cloneState(state),
      stateAfter: cloneState(applied.next),
      human: applied.applied,
      confidence: HIGH,
      source: "fixture",
    });
    state = applied.next;
  }
  return steps;
}
