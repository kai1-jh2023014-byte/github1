import { describe, expect, it } from "vitest";
import { BeamSearch } from "../core/search";
import { DEFAULT_WEIGHTS } from "./weights";
import { DEFAULT_MECHANICS } from "./weights";
import { createBoard } from "../game/board";
import { createPiece } from "../game/piece";
import { ROWS } from "../game/constants";
import type { TetrisGameState } from "../core/state";

function emptyState(): TetrisGameState {
  return {
    board: createBoard(),
    current: createPiece("T"),
    nextPieces: ["I", "J", "L", "O", "S"],
    holdPiece: null,
    canHold: true,
    combo: 0,
    backToBack: false,
    phase: "playing",
  };
}

function wellState(): TetrisGameState {
  const board = createBoard();
  for (let x = 0; x < 9; x++) {
    for (let i = 0; i < 8; i++) board[ROWS - 1 - i]![x] = "L";
  }
  board[ROWS - 1]![9] = "J";
  board[ROWS - 2]![9] = "J";
  return {
    ...emptyState(),
    board,
    current: createPiece("I"),
  };
}

describe("gated hold search", () => {
  it("does not add Hold candidates on an empty board", () => {
    const beam = new BeamSearch({ useHold: false, useGatedHold: true, depth: 2, beamWidth: 8 });
    const result = beam.search(emptyState(), {
      weights: DEFAULT_WEIGHTS,
      depth: 2,
      beamWidth: 8,
      useHold: false,
      useGatedHold: true,
      mechanicsWeights: DEFAULT_MECHANICS,
    });
    expect(result.candidates.some((c) => c.placement.hold)).toBe(false);
  });

  it("adds Hold candidates when I-save gate fires", () => {
    const beam = new BeamSearch({ useHold: false, useGatedHold: true, depth: 2, beamWidth: 8 });
    const result = beam.search(wellState(), {
      weights: DEFAULT_WEIGHTS,
      depth: 2,
      beamWidth: 8,
      useHold: false,
      useGatedHold: true,
      mechanicsWeights: DEFAULT_MECHANICS,
    });
    expect(result.candidates.some((c) => c.placement.hold)).toBe(true);
  });
});
