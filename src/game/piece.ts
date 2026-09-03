import { getPieceCells, SPAWN } from "./tetrominoes";
import type { ActivePiece, Point, TetrominoType } from "./types";

let nextPieceId = 1;

export function createPiece(type: TetrominoType, id = nextPieceId++): ActivePiece {
  const spawn = SPAWN[type];
  return {
    id,
    type,
    rotation: 0,
    x: spawn.x,
    y: spawn.y,
  };
}

export function pieceCells(piece: ActivePiece): Point[] {
  return getPieceCells(piece.type, piece.rotation, piece.x, piece.y);
}

export function clonePiece(piece: ActivePiece): ActivePiece {
  return { ...piece };
}
