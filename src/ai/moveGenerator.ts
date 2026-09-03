import { canPlace, dropToBottom, tryMove, tryRotate } from "../game/collision";
import { createPiece } from "../game/piece";
import type { ActivePiece, Board, TetrominoType } from "../game/types";
import type { Placement } from "./types";

export interface GeneratedMove {
  placement: Placement;
  piece: ActivePiece;
}

export function generateMoves(board: Board, type: TetrominoType): GeneratedMove[] {
  const moves: GeneratedMove[] = [];
  const seen = new Set<string>();
  const spawn = createPiece(type, 0);

  for (let rotations = 0; rotations < 4; rotations++) {
    const rotated = rotateN(board, spawn, rotations);
    if (!rotated) continue;

    for (const columnPiece of reachableColumns(board, rotated)) {
      const dropped = dropToBottom(board, columnPiece);
      if (!canPlace(board, dropped)) continue;
      const key = `${dropped.rotation}:${dropped.x}:${dropped.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      moves.push({
        placement: {
          rotation: dropped.rotation,
          x: dropped.x,
          y: dropped.y,
        },
        piece: dropped,
      });
    }
  }

  return moves;
}

function rotateN(board: Board, piece: ActivePiece, times: number): ActivePiece | null {
  let current = piece;
  for (let i = 0; i < times; i++) {
    const next = tryRotate(board, current, 1);
    if (!next) return null;
    current = next;
  }
  return current;
}

function reachableColumns(board: Board, piece: ActivePiece): ActivePiece[] {
  const columns: ActivePiece[] = [];
  let leftmost = piece;
  while (true) {
    const left = tryMove(board, leftmost, -1, 0);
    if (!left) break;
    leftmost = left;
  }
  let cursor: ActivePiece | null = leftmost;
  while (cursor) {
    columns.push(cursor);
    cursor = tryMove(board, cursor, 1, 0);
  }
  return columns;
}
