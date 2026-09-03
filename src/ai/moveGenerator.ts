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

export function generateMovesWithSpins(board: Board, type: TetrominoType): GeneratedMove[] {
  const base = generateMoves(board, type);
  const moves = [...base];
  const seen = new Set(base.map((m) => `${m.piece.rotation}:${m.piece.x}:${m.piece.y}`));
  for (const move of base) {
    for (const dir of [1, -1] as const) {
      const spun = tryRotate(board, move.piece, dir);
      if (!spun) continue;
      if (tryMove(board, spun, 0, 1)) continue;
      const key = `${spun.rotation}:${spun.x}:${spun.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      moves.push({
        piece: spun,
        placement: {
          rotation: spun.rotation,
          x: spun.x,
          y: spun.y,
          spinPre: {
            rotation: move.piece.rotation,
            x: move.piece.x,
            y: move.piece.y,
          },
        },
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
