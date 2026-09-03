import type { Point, TetrominoType } from "./types";

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: "#2de2e6",
  O: "#f5d300",
  T: "#c774e8",
  S: "#3dff8a",
  Z: "#ff4d6d",
  J: "#4d7cff",
  L: "#ff9f1c",
};

const MATRICES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

function cellsFromMatrix(matrix: number[][]): Point[] {
  const cells: Point[] = [];
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x]) cells.push({ x, y });
    }
  }
  return cells;
}

function rotateMatrixCW(matrix: number[][]): number[][] {
  const n = matrix.length;
  const next = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      next[x][n - 1 - y] = matrix[y][x];
    }
  }
  return next;
}

function allRotations(matrix: number[][]): Point[][] {
  const rotations: Point[][] = [];
  let current = matrix;
  for (let i = 0; i < 4; i++) {
    rotations.push(cellsFromMatrix(current));
    current = rotateMatrixCW(current);
  }
  return rotations;
}

export const SHAPES: Record<TetrominoType, Point[][]> = {
  I: allRotations(MATRICES.I),
  O: allRotations(MATRICES.O),
  T: allRotations(MATRICES.T),
  S: allRotations(MATRICES.S),
  Z: allRotations(MATRICES.Z),
  J: allRotations(MATRICES.J),
  L: allRotations(MATRICES.L),
};

export const SPAWN: Record<TetrominoType, Point> = {
  I: { x: 3, y: -1 },
  O: { x: 4, y: 0 },
  T: { x: 3, y: 0 },
  S: { x: 3, y: 0 },
  Z: { x: 3, y: 0 },
  J: { x: 3, y: 0 },
  L: { x: 3, y: 0 },
};

export function getPieceCells(
  type: TetrominoType,
  rotation: number,
  originX: number,
  originY: number,
): Point[] {
  const shape = SHAPES[type][rotation % 4];
  return shape.map((cell) => ({ x: originX + cell.x, y: originY + cell.y }));
}
