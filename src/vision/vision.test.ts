import { describe, expect, it } from "vitest";
import { createBoard } from "../game/board";
import { COLS, ROWS } from "../game/constants";
import { createPiece } from "../game/piece";
import { TETROMINO_TYPES } from "../game/types";
import type { TetrominoType } from "../game/types";
import { mulberry32, pickType } from "../game/seeded";
import { compareBoards, detectCells, detectGameState } from "./detect";
import { renderFrame } from "./render";
import { TetrisAICore } from "../core/ai";
import { PlySearch } from "../core/search";
import { DEFAULT_WEIGHTS } from "../ai/weights";

describe("board vision PoC", () => {
  it("recognizes 1000 random locked boards", () => {
    const rng = mulberry32(42);
    let correct = 0;
    let total = 0;
    let time = 0;
    for (let i = 0; i < 1000; i++) {
      const board = randomBoard(rng, 8 + Math.floor(rng() * 40));
      const frame = renderFrame(board);
      const started = now();
      const detected = detectCells(frame);
      time += now() - started;
      const cmp = compareBoards(board, detected);
      correct += cmp.correct;
      total += cmp.total;
    }
    const accuracy = correct / total;
    const avgMs = time / 1000;
    // eslint-disable-next-line no-console
    console.log(`VISION boards accuracy=${accuracy.toFixed(6)} avgDetectMs=${avgMs.toFixed(3)} cells=${correct}/${total}`);
    expect(accuracy).toBe(1);
    expect(avgMs).toBeLessThan(20);
  });

  it("detects floating pieces on 200 boards", () => {
    const rng = mulberry32(7);
    let ok = 0;
    for (let i = 0; i < 200; i++) {
      const type = pickType(rng, TETROMINO_TYPES);
      const board = createBoard();
      const piece = createPiece(type, i + 1);
      piece.x = 1 + Math.floor(rng() * 6);
      piece.y = 2 + Math.floor(rng() * 4);
      const frame = renderFrame(board, piece);
      const detected = detectGameState(frame);
      if (
        detected.state.current?.type === type &&
        boardsEqual(detected.state.board, board)
      ) {
        ok += 1;
      }
    }
    expect(ok).toBe(200);
    // eslint-disable-next-line no-console
    console.log(`VISION pieces detected=${ok}/200`);
  });

  it("vision-derived 1-ply targets match engine-state targets", () => {
    const rng = mulberry32(99);
    const core = new TetrisAICore(new PlySearch());
    let match = 0;
    for (let i = 0; i < 50; i++) {
      const board = randomBoard(rng, 10);
      const type = pickType(rng, TETROMINO_TYPES);
      const piece = createPiece(type, i + 1);
      piece.x = 2;
      piece.y = 2;
      const frame = renderFrame(board, piece);
      const detected = detectGameState(frame).state;
      detected.nextPieces = ["I"];
      const fromVision = core.plan(detected, { weights: DEFAULT_WEIGHTS, depth: 1 });
      const fromTruth = core.plan(
        {
          board,
          current: piece,
          nextPieces: ["I"],
          holdPiece: null,
          canHold: false,
          combo: 0,
          backToBack: false,
          phase: "playing",
        },
        { weights: DEFAULT_WEIGHTS, depth: 1 },
      );
      if (
        fromVision.target?.x === fromTruth.target?.x &&
        fromVision.target?.rotation === fromTruth.target?.rotation
      ) {
        match += 1;
      }
    }
    // eslint-disable-next-line no-console
    console.log(`VISION closed-loop decide match=${match}/50`);
    expect(match).toBeGreaterThanOrEqual(45);
  });
});

function randomBoard(rng: () => number, filled: number) {
  const board = createBoard();
  let n = 0;
  while (n < filled) {
    const x = Math.floor(rng() * COLS);
    const y = ROWS - 1 - Math.floor(rng() * 8);
    const type = pickType(rng, TETROMINO_TYPES) as TetrominoType;
    if (board[y][x] === 0) {
      board[y][x] = type;
      n += 1;
    }
  }
  return board;
}

function boardsEqual(a: ReturnType<typeof createBoard>, b: ReturnType<typeof createBoard>): boolean {
  return compareBoards(a, b).correct === ROWS * COLS;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
