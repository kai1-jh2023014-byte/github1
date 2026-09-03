import { CELL_SIZE, COLS, ROWS } from "../game/constants";
import { SHAPES } from "../game/tetrominoes";
import { createBoard } from "../game/board";
import type { ActivePiece, Board, Cell, TetrominoType } from "../game/types";
import { TETROMINO_TYPES } from "../game/types";
import { BOARD_BG, PIECE_RGB, colorDistance } from "./colors";
import type { PixelBuffer } from "./render";
import type { TetrisGameState } from "../core/state";

export interface VisionReport {
  board: Board;
  current: ActivePiece | null;
  cellsCorrect: number;
  cellsTotal: number;
  elapsedMs: number;
}

export function detectCells(buffer: PixelBuffer): Board {
  const board = createBoard();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      board[y][x] = classifyCell(buffer, x, y);
    }
  }
  return board;
}

export function detectGameState(buffer: PixelBuffer): { state: TetrisGameState; elapsedMs: number } {
  const started = nowMs();
  const visible = detectCells(buffer);
  const split = splitActivePiece(visible);
  return {
    elapsedMs: nowMs() - started,
    state: {
      board: split.board,
      current: split.current,
      nextPieces: [],
      holdPiece: null,
      canHold: false,
      phase: "playing",
    },
  };
}

export function compareBoards(expected: Board, actual: Board): { correct: number; total: number } {
  let correct = 0;
  const total = ROWS * COLS;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (expected[y][x] === actual[y][x]) correct += 1;
    }
  }
  return { correct, total };
}

export function splitActivePiece(visible: Board): { board: Board; current: ActivePiece | null } {
  const components = connectedComponents(visible);
  const floating = components.filter((component) => !touchesFloor(component));
  const pieceComponent = floating.find((component) => component.length === 4) ?? null;
  if (!pieceComponent) {
    return { board: cloneCells(visible), current: null };
  }

  const type = visible[pieceComponent[0].y][pieceComponent[0].x] as TetrominoType;
  const current = inferPiece(type, pieceComponent);
  const board = cloneCells(visible);
  for (const cell of pieceComponent) board[cell.y][cell.x] = 0;
  return { board, current };
}

function classifyCell(buffer: PixelBuffer, col: number, row: number): Cell {
  const rgb = sampleCell(buffer, col, row);
  if (colorDistance(rgb, BOARD_BG) < 28) return 0;
  let best: TetrominoType = "I";
  let bestDist = Infinity;
  for (const type of TETROMINO_TYPES) {
    const dist = colorDistance(rgb, PIECE_RGB[type]);
    if (dist < bestDist) {
      bestDist = dist;
      best = type;
    }
  }
  return bestDist < 90 ? best : 0;
}

function sampleCell(
  buffer: PixelBuffer,
  col: number,
  row: number,
): [number, number, number] {
  const cx = Math.floor((col + 0.5) * CELL_SIZE);
  const cy = Math.floor((row + 0.62) * CELL_SIZE);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) continue;
      const i = (y * buffer.width + x) * 4;
      r += buffer.data[i];
      g += buffer.data[i + 1];
      b += buffer.data[i + 2];
      n += 1;
    }
  }
  return n === 0 ? BOARD_BG : [r / n, g / n, b / n];
}

function connectedComponents(board: Board): { x: number; y: number }[][] {
  const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const components: { x: number; y: number }[][] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x] || seen[y][x]) continue;
      const stack = [{ x, y }];
      const cells: { x: number; y: number }[] = [];
      seen[y][x] = true;
      while (stack.length) {
        const cur = stack.pop()!;
        cells.push(cur);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
          if (seen[ny][nx] || !board[ny][nx]) continue;
          seen[ny][nx] = true;
          stack.push({ x: nx, y: ny });
        }
      }
      components.push(cells);
    }
  }
  return components;
}

function touchesFloor(cells: { x: number; y: number }[]): boolean {
  return cells.some((cell) => cell.y === ROWS - 1);
}

function inferPiece(type: TetrominoType, cells: { x: number; y: number }[]): ActivePiece | null {
  const set = new Set(cells.map((cell) => key(cell.x, cell.y)));
  for (let rotation = 0; rotation < 4; rotation++) {
    const shape = SHAPES[type][rotation];
    const minCellX = Math.min(...cells.map((c) => c.x));
    const minCellY = Math.min(...cells.map((c) => c.y));
    const minShapeX = Math.min(...shape.map((c) => c.x));
    const minShapeY = Math.min(...shape.map((c) => c.y));
    const originX = minCellX - minShapeX;
    const originY = minCellY - minShapeY;
    const predicted = shape.map((c) => key(originX + c.x, originY + c.y));
    if (predicted.every((k) => set.has(k)) && predicted.length === set.size) {
      return { id: 0, type, rotation, x: originX, y: originY };
    }
  }
  return { id: 0, type, rotation: 0, x: Math.min(...cells.map((c) => c.x)), y: Math.min(...cells.map((c) => c.y)) };
}

function cloneCells(board: Board): Board {
  return board.map((row) => row.slice());
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
