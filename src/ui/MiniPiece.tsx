import { getPieceCells, TETROMINO_COLORS } from "../game/tetrominoes";
import type { TetrominoType } from "../game/types";

const SIZE = 18;

interface MiniPieceProps {
  type: TetrominoType | null;
}

export function MiniPiece({ type }: MiniPieceProps) {
  if (!type) {
    return <div className="mini-piece mini-piece-empty">—</div>;
  }
  const cells = getPieceCells(type, 0, 0, 0);
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  const maxX = Math.max(...cells.map((c) => c.x));
  const maxY = Math.max(...cells.map((c) => c.y));
  const width = (maxX - minX + 1) * SIZE;
  const height = (maxY - minY + 1) * SIZE;

  return (
    <div className="mini-piece" style={{ width, height }}>
      {cells.map((cell, i) => (
        <span
          key={i}
          className="mini-cell"
          style={{
            left: (cell.x - minX) * SIZE,
            top: (cell.y - minY) * SIZE,
            width: SIZE - 2,
            height: SIZE - 2,
            background: TETROMINO_COLORS[type],
          }}
        />
      ))}
    </div>
  );
}
