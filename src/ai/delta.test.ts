import { describe, expect, it } from "vitest";
import { createBoard } from "../game/board";
import { ROWS } from "../game/constants";
import {
  HOLE_SMALL,
  SURFACE_SMALL,
  WELL_MEDIUM,
  WELL_SMALL,
  scoreHoleDelta,
  scoreSurfaceDelta,
  scoreWellDelta,
  wellShapeQuality,
} from "./delta";
import { findTetrisWell } from "./structure";

function sideWell(wall = 8, wellFill = 2) {
  const board = createBoard();
  for (let x = 0; x < 9; x++) {
    for (let i = 0; i < wall; i++) board[ROWS - 1 - i]![x] = "L";
  }
  for (let i = 0; i < wellFill; i++) board[ROWS - 1 - i]![9] = "J";
  return board;
}

describe("parent-delta scoring", () => {
  it("treats unchanged well quality as neutral", () => {
    const q = wellShapeQuality(5);
    expect(scoreWellDelta(q, q, WELL_SMALL)).toBe(0);
  });

  it("penalizes well destruction and does not reward creation at WELL_SMALL", () => {
    const parent = wellShapeQuality(5);
    const destroyed = wellShapeQuality(2);
    const created = wellShapeQuality(5);
    expect(scoreWellDelta(parent, destroyed, WELL_SMALL)).toBeLessThan(0);
    expect(scoreWellDelta(0, created, WELL_SMALL)).toBe(0);
    expect(scoreWellDelta(0, created, WELL_MEDIUM)).toBeGreaterThan(0);
  });

  it("does not rank a depth-8 well above a depth-5 well", () => {
    expect(wellShapeQuality(8)).toBeLessThan(wellShapeQuality(5));
    expect(scoreWellDelta(wellShapeQuality(5), wellShapeQuality(8), WELL_MEDIUM)).toBeLessThan(0);
  });

  it("penalizes new holes more than it rewards fills at HOLE_SMALL", () => {
    expect(scoreHoleDelta(3, 5, HOLE_SMALL)).toBeLessThan(0);
    expect(scoreHoleDelta(3, 2, HOLE_SMALL)).toBe(0);
    expect(scoreHoleDelta(3, 3, HOLE_SMALL)).toBe(0);
  });

  it("scores only new cliffs and ignores tetris-well edges", () => {
    const parent = [8, 8, 8, 8, 8, 8, 8, 8, 8, 2];
    const same = parent.slice();
    expect(scoreSurfaceDelta(parent, same, SURFACE_SMALL, 9, 9)).toBe(0);

    const newValley = [8, 8, 8, 2, 8, 8, 8, 8, 8, 2];
    expect(scoreSurfaceDelta(parent, newValley, SURFACE_SMALL, 9, 9)).toBeLessThan(0);

    const deeperWell = [8, 8, 8, 8, 8, 8, 8, 8, 8, 0];
    expect(scoreSurfaceDelta(parent, deeperWell, SURFACE_SMALL, 9, 9)).toBe(0);
  });

  it("finds a real well so quality is non-zero on a side trench", () => {
    const well = findTetrisWell(sideWell());
    expect(well).not.toBeNull();
    expect(wellShapeQuality(well!.depth)).toBeGreaterThan(0);
  });
});
