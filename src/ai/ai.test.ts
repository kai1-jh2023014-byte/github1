import { describe, expect, it } from "vitest";
import { createBoard } from "../game/board";
import { canPlace } from "../game/collision";
import { ROWS } from "../game/constants";
import { placeAndClear } from "../game/lineClear";
import { computeFeatures, evaluateBoard } from "./evaluator";
import { generateMoves, generateMovesWithSpins } from "./moveGenerator";
import { findBestMove } from "./search";
import { DEFAULT_WEIGHTS } from "./weights";
import { AIPlayer } from "./player";
import { GameEngine } from "../game/engine";
import { BrowserGameAdapter } from "../adapters/browser";
import type { TetrominoType } from "../game/types";

describe("evaluator", () => {
  it("counts holes under filled cells", () => {
    const board = createBoard();
    board[ROWS - 1][0] = 0;
    board[ROWS - 2][0] = "I";
    const features = computeFeatures(board, 0);
    expect(features.holes).toBe(1);
    expect(features.maxHeight).toBe(2);
    expect(features.aggregateHeight).toBe(2);
  });

  it("gives a flat stack zero bumpiness", () => {
    const board = createBoard();
    for (let x = 0; x < 10; x++) board[ROWS - 1][x] = "O";
    expect(computeFeatures(board, 1).bumpiness).toBe(0);
    expect(computeFeatures(board, 1).density).toBe(1);
  });

  it("scores line clears positively relative to holes", () => {
    const board = createBoard();
    const withLines = evaluateBoard(board, 4, DEFAULT_WEIGHTS).score;
    board[ROWS - 2][3] = "T";
    board[ROWS - 1][3] = 0;
    const withHole = evaluateBoard(board, 0, DEFAULT_WEIGHTS).score;
    expect(withLines).toBeGreaterThan(withHole);
  });
});

describe("move generator", () => {
  it("only returns legal resting placements", () => {
    const board = createBoard();
    const moves = generateMoves(board, "T");
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      expect(canPlace(board, move.piece)).toBe(true);
      expect(canPlace(board, { ...move.piece, y: move.piece.y + 1 })).toBe(false);
    }
  });

  it("does not overlap existing blocks", () => {
    const board = createBoard();
    for (let x = 0; x < 6; x++) board[ROWS - 1][x] = "I";
    const moves = generateMoves(board, "O");
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      const placed = placeAndClear(board, move.piece).board;
      expect(placed.flat().filter((cell) => cell !== 0).length).toBeGreaterThan(0);
    }
  });

  it("adds grounded spin placements on top of ordinary moves", () => {
    const board = createBoard();
    const base = generateMoves(board, "T");
    const withSpins = generateMovesWithSpins(board, "T");
    expect(withSpins.length).toBeGreaterThanOrEqual(base.length);
  });
});

describe("search", () => {
  it("selects a legal 1-ply move", () => {
    const board = createBoard();
    const result = findBestMove(board, "L", "T", DEFAULT_WEIGHTS, 1);
    expect(result.move).not.toBeNull();
    expect(result.depth).toBe(1);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    const legal = generateMoves(board, "L").some(
      (move) =>
        move.placement.x === result.move?.x &&
        move.placement.rotation === result.move.rotation,
    );
    expect(legal).toBe(true);
  });

  it("selects a legal 2-ply move using the next piece", () => {
    const board = createBoard();
    const result = findBestMove(board, "I", "O", DEFAULT_WEIGHTS, 2);
    expect(result.move).not.toBeNull();
    expect(result.depth).toBe(2);
    expect(result.nodes).toBeGreaterThan(result.candidates.length);
    const legal = generateMoves(board, "I").some(
      (move) =>
        move.placement.x === result.move?.x &&
        move.placement.rotation === result.move.rotation,
    );
    expect(legal).toBe(true);
  });
});

describe("AI player", () => {
  it("plays through ordinary engine actions and survives a long run", () => {
    const engine = new GameEngine();
    const adapter = new BrowserGameAdapter(engine);
    const ai = new AIPlayer({ depth: 1, actionDelayMs: 1 });
    ai.setEnabled(true);
    engine.start();

    let now = 0;
    let actions = 0;
    const originalInput = engine.input.bind(engine);
    engine.input = (action) => {
      actions += 1;
      return originalInput(action);
    };

    for (let i = 0; i < 400; i++) {
      now += 16;
      engine.tick(now);
      ai.tick(now, adapter);
      if (engine.getStatus() === "gameover") break;
    }

    const snap = engine.getSnapshot();
    expect(actions).toBeGreaterThan(20);
    expect(snap.lines).toBeGreaterThan(0);
    expect(snap.status).toBe("playing");
    expect(snap.score).toBeGreaterThan(0);
  });

  it("never instructs an illegal placement from spawn", () => {
    const types: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];
    const board = createBoard();
    for (const type of types) {
      const result = findBestMove(board, type, "I", DEFAULT_WEIGHTS, 1);
      const match = generateMoves(board, type).find(
        (move) =>
          move.placement.x === result.move?.x &&
          move.placement.rotation === result.move?.rotation,
      );
      expect(match, type).toBeTruthy();
      expect(canPlace(board, match!.piece)).toBe(true);
    }
  });
});
