import { createBoard } from "./board";
import { canPlace, dropToBottom, ghostPiece, tryMove, tryRotate } from "./collision";
import { dropIntervalMs } from "./constants";
import { clearLines, lockPiece, pieceHasCellsAboveBoard } from "./lineClear";
import { createPiece } from "./piece";
import { BagRandomizer } from "./randomizer";
import { hardDropScore, levelFromLines, lineClearScore, softDropScore } from "./scoring";
import type {
  ActivePiece,
  Board,
  GameAction,
  GameSnapshot,
  GameStatus,
  TetrominoType,
} from "./types";

export interface PieceSource {
  next(): TetrominoType;
}

export interface GameEngineOptions {
  randomizer?: PieceSource;
}

export class GameEngine {
  private board: Board = createBoard();
  private current: ActivePiece | null = null;
  private nextType: TetrominoType | null = null;
  private score = 0;
  private lines = 0;
  private status: GameStatus = "ready";
  private dropAccum = 0;
  private lastTime = 0;
  private randomizer: PieceSource;
  private listeners = new Set<() => void>();

  constructor(options: GameEngineOptions = {}) {
    this.randomizer = options.randomizer ?? new BagRandomizer();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): GameSnapshot {
    return {
      board: this.board,
      current: this.current,
      next: this.nextType,
      score: this.score,
      level: this.level,
      lines: this.lines,
      status: this.status,
      ghost: this.current ? ghostPiece(this.board, this.current) : null,
    };
  }

  get level(): number {
    return levelFromLines(this.lines);
  }

  getBoard(): Board {
    return this.board;
  }

  getCurrent(): ActivePiece | null {
    return this.current;
  }

  getNext(): TetrominoType | null {
    return this.nextType;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  start(): void {
    if (this.status === "playing") return;
    if (this.status === "paused") {
      this.resume();
      return;
    }
    this.resetState();
    this.status = "playing";
    this.spawnPiece();
    this.notify();
  }

  pause(): void {
    if (this.status !== "playing") return;
    this.status = "paused";
    this.notify();
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.dropAccum = 0;
    this.lastTime = 0;
    this.notify();
  }

  restart(): void {
    this.resetState();
    this.status = "playing";
    this.spawnPiece();
    this.notify();
  }

  tick(now: number): void {
    if (this.status !== "playing") {
      this.lastTime = now;
      return;
    }
    if (this.lastTime === 0) {
      this.lastTime = now;
      return;
    }
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.dropAccum += dt;
    const interval = dropIntervalMs(this.level);
    if (this.dropAccum > interval * 2) this.dropAccum = interval * 2;
    let changed = false;
    let steps = 0;
    while (this.status === "playing" && this.dropAccum >= interval && steps < 2) {
      this.dropAccum -= interval;
      this.gravity();
      changed = true;
      steps += 1;
    }
    if (changed) this.notify();
  }

  input(action: GameAction): boolean {
    if (this.status !== "playing" || !this.current) return false;
    switch (action) {
      case "left":
        return this.applyMove(-1, 0);
      case "right":
        return this.applyMove(1, 0);
      case "rotateCW":
        return this.applyRotate(1);
      case "rotateCCW":
        return this.applyRotate(-1);
      case "softDrop":
        return this.softDrop();
      case "hardDrop":
        return this.hardDrop();
      default:
        return false;
    }
  }

  private resetState(): void {
    this.board = createBoard();
    this.current = null;
    this.nextType = this.randomizer.next();
    this.score = 0;
    this.lines = 0;
    this.dropAccum = 0;
    this.lastTime = 0;
  }

  private spawnPiece(): void {
    const type = this.nextType ?? this.randomizer.next();
    this.nextType = this.randomizer.next();
    const piece = createPiece(type);
    if (!canPlace(this.board, piece)) {
      this.current = piece;
      this.status = "gameover";
      return;
    }
    this.current = piece;
  }

  private gravity(): void {
    if (!this.current) return;
    const down = tryMove(this.board, this.current, 0, 1);
    if (down) {
      this.current = down;
      return;
    }
    this.lockCurrent();
  }

  private applyMove(dx: number, dy: number): boolean {
    if (!this.current) return false;
    const next = tryMove(this.board, this.current, dx, dy);
    if (!next) return false;
    this.current = next;
    this.notify();
    return true;
  }

  private applyRotate(dir: 1 | -1): boolean {
    if (!this.current) return false;
    const next = tryRotate(this.board, this.current, dir);
    if (!next) return false;
    this.current = next;
    this.notify();
    return true;
  }

  private softDrop(): boolean {
    if (!this.current) return false;
    const down = tryMove(this.board, this.current, 0, 1);
    if (down) {
      this.current = down;
      this.score += softDropScore(1);
      this.notify();
      return true;
    }
    this.lockCurrent();
    this.notify();
    return true;
  }

  private hardDrop(): boolean {
    if (!this.current) return false;
    const dropped = dropToBottom(this.board, this.current);
    const cells = dropped.y - this.current.y;
    this.current = dropped;
    this.score += hardDropScore(Math.max(0, cells));
    this.lockCurrent();
    this.notify();
    return true;
  }

  private lockCurrent(): void {
    if (!this.current) return;
    if (pieceHasCellsAboveBoard(this.current)) {
      this.status = "gameover";
      this.current = null;
      return;
    }
    const locked = lockPiece(this.board, this.current);
    const { board, cleared } = clearLines(locked);
    this.board = board;
    if (cleared > 0) {
      this.score += lineClearScore(cleared, this.level);
      this.lines += cleared;
    }
    this.current = null;
    if (this.status === "playing") this.spawnPiece();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
