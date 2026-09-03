import { CELL_SIZE, COLS, ROWS } from "../game/constants";
import { pieceCells } from "../game/piece";
import { TETROMINO_COLORS } from "../game/tetrominoes";
import type { ActivePiece, Board } from "../game/types";
import { useEffect, useRef } from "react";

const WIDTH = COLS * CELL_SIZE;
const HEIGHT = ROWS * CELL_SIZE;

interface BoardCanvasProps {
  board: Board;
  current: ActivePiece | null;
  ghost: ActivePiece | null;
}

export function BoardCanvas({ board, current, ghost }: BoardCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawBoard(ctx, board, current, ghost);
  }, [board, current, ghost]);

  return (
    <canvas
      ref={ref}
      width={WIDTH}
      height={HEIGHT}
      className="board-canvas"
    />
  );
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  current: ActivePiece | null,
  ghost: ActivePiece | null,
): void {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.strokeStyle = "rgba(90, 140, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x * CELL_SIZE + 0.5, y * CELL_SIZE + 0.5, CELL_SIZE, CELL_SIZE);
    }
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = board[y][x];
      if (cell) drawCell(ctx, x, y, TETROMINO_COLORS[cell], 1);
    }
  }

  if (ghost && current) {
    for (const cell of pieceCells(ghost)) {
      if (cell.y < 0) continue;
      drawCell(ctx, cell.x, cell.y, TETROMINO_COLORS[current.type], 0.18, true);
    }
  }

  if (current) {
    for (const cell of pieceCells(current)) {
      if (cell.y < 0) continue;
      drawCell(ctx, cell.x, cell.y, TETROMINO_COLORS[current.type], 1);
    }
  }
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  alpha: number,
  outline = false,
): void {
  const pad = 2;
  const px = x * CELL_SIZE + pad;
  const py = y * CELL_SIZE + pad;
  const size = CELL_SIZE - pad * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (outline) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    roundRect(ctx, px, py, size, size, 5);
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    roundRect(ctx, px, py, size, size, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    roundRect(ctx, px + 3, py + 3, size * 0.45, 7, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    roundRect(ctx, px + 4, py + size - 9, size - 8, 5, 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
