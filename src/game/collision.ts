import { COLS, ROWS } from "./constants";
import { pieceCells } from "./piece";
import type { ActivePiece, Board } from "./types";

const KICKS: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
];

export function canPlace(board: Board, piece: ActivePiece): boolean {
  for (const cell of pieceCells(piece)) {
    if (cell.x < 0 || cell.x >= COLS || cell.y >= ROWS) return false;
    if (cell.y >= 0 && board[cell.y][cell.x] !== 0) return false;
  }
  return true;
}

export function tryMove(
  board: Board,
  piece: ActivePiece,
  dx: number,
  dy: number,
): ActivePiece | null {
  const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
  return canPlace(board, next) ? next : null;
}

export function tryRotate(
  board: Board,
  piece: ActivePiece,
  dir: 1 | -1,
): ActivePiece | null {
  const rotation = (piece.rotation + dir + 4) % 4;
  for (const kick of KICKS) {
    const next = {
      ...piece,
      rotation,
      x: piece.x + kick.x,
      y: piece.y + kick.y,
    };
    if (canPlace(board, next)) return next;
  }
  return null;
}

export function dropToBottom(board: Board, piece: ActivePiece): ActivePiece {
  let current = piece;
  while (true) {
    const down = tryMove(board, current, 0, 1);
    if (!down) return current;
    current = down;
  }
}

export function ghostPiece(board: Board, piece: ActivePiece): ActivePiece {
  return dropToBottom(board, piece);
}
