import { createBoard, occupiedCount } from "./board";
import { canPlace, dropToBottom, ghostPiece, tryMove, tryRotate } from "./collision";
import { dropIntervalMs, NEXT_QUEUE_SIZE } from "./constants";
import { clearLines, lockPiece, pieceHasCellsAboveBoard } from "./lineClear";
import { createPiece } from "./piece";
import { BagRandomizer } from "./randomizer";
import { hardDropScore, levelFromLines, softDropScore } from "./scoring";
import { detectTSpin, lockScore, nextBackToBack, nextCombo } from "../core/mechanics";
import type { TSpinKind } from "../core/mechanics";
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

export interface GameStats {
  holds: number;
  tSpins: number;
  tSpinMinis: number;
  maxCombo: number;
  b2bClears: number;
  perfectClears: number;
  tetrises: number;
}

export class GameEngine {
  private board: Board = createBoard();
  private current: ActivePiece | null = null;
  private nextQueue: TetrominoType[] = [];
  private holdPiece: TetrominoType | null = null;
  private canHold = true;
  private combo = 0;
  private backToBack = false;
  private lastWasRotate = false;
  private score = 0;
  private lines = 0;
  private status: GameStatus = "ready";
  private dropAccum = 0;
  private lastTime = 0;
  private randomizer: PieceSource;
  private listeners = new Set<() => void>();
  private stats: GameStats = emptyStats();

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
      next: this.nextQueue[0] ?? null,
      nextQueue: this.nextQueue.slice(),
      hold: this.holdPiece,
      canHold: this.canHold,
      combo: this.combo,
      backToBack: this.backToBack,
      score: this.score,
      level: this.level,
      lines: this.lines,
      status: this.status,
      ghost: this.current ? ghostPiece(this.board, this.current) : null,
      stats: { ...this.stats },
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
    return this.nextQueue[0] ?? null;
  }

  getNextQueue(): TetrominoType[] {
    return this.nextQueue.slice();
  }

  getHold(): TetrominoType | null {
    return this.holdPiece;
  }

  getCanHold(): boolean {
    return this.canHold;
  }

  getCombo(): number {
    return this.combo;
  }

  getBackToBack(): boolean {
    return this.backToBack;
  }

  getStats(): GameStats {
    return { ...this.stats };
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
      case "hold":
        return this.hold();
      default:
        return false;
    }
  }

  private resetState(): void {
    this.board = createBoard();
    this.current = null;
    this.nextQueue = [];
    while (this.nextQueue.length < NEXT_QUEUE_SIZE) {
      this.nextQueue.push(this.randomizer.next());
    }
    this.holdPiece = null;
    this.canHold = true;
    this.combo = 0;
    this.backToBack = false;
    this.lastWasRotate = false;
    this.score = 0;
    this.lines = 0;
    this.dropAccum = 0;
    this.lastTime = 0;
    this.stats = emptyStats();
  }

  private spawnPiece(): void {
    const type = this.nextQueue.shift();
    if (!type) {
      this.status = "gameover";
      return;
    }
    this.nextQueue.push(this.randomizer.next());
    const piece = createPiece(type);
    if (!canPlace(this.board, piece)) {
      this.current = piece;
      this.status = "gameover";
      return;
    }
    this.current = piece;
    this.lastWasRotate = false;
  }

  private hold(): boolean {
    if (!this.current || !this.canHold) return false;
    const outgoing = this.current.type;
    if (this.holdPiece === null) {
      this.holdPiece = outgoing;
      this.canHold = false;
      this.lastWasRotate = false;
      this.spawnPiece();
      this.canHold = false;
      this.stats.holds += 1;
      this.notify();
      return true;
    }
    const incoming = this.holdPiece;
    this.holdPiece = outgoing;
    this.canHold = false;
    this.lastWasRotate = false;
    const piece = createPiece(incoming);
    if (!canPlace(this.board, piece)) {
      this.current = piece;
      this.status = "gameover";
      this.notify();
      return true;
    }
    this.current = piece;
    this.stats.holds += 1;
    this.notify();
    return true;
  }

  private gravity(): void {
    if (!this.current) return;
    const down = tryMove(this.board, this.current, 0, 1);
    if (down) {
      this.current = down;
      this.lastWasRotate = false;
      return;
    }
    this.lockCurrent();
  }

  private applyMove(dx: number, dy: number): boolean {
    if (!this.current) return false;
    const next = tryMove(this.board, this.current, dx, dy);
    if (!next) return false;
    this.current = next;
    this.lastWasRotate = false;
    this.notify();
    return true;
  }

  private applyRotate(dir: 1 | -1): boolean {
    if (!this.current) return false;
    const next = tryRotate(this.board, this.current, dir);
    if (!next) return false;
    this.current = next;
    this.lastWasRotate = true;
    this.notify();
    return true;
  }

  private softDrop(): boolean {
    if (!this.current) return false;
    const down = tryMove(this.board, this.current, 0, 1);
    if (down) {
      this.current = down;
      this.lastWasRotate = false;
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
    if (cells > 0) this.lastWasRotate = false;
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
    const tSpin = detectTSpin(this.board, this.current, this.lastWasRotate);
    const locked = lockPiece(this.board, this.current);
    const { board, cleared } = clearLines(locked);
    const perfectClear = occupiedCount(board) === 0;
    this.score += lockScore({
      cleared,
      tSpin,
      combo: this.combo,
      backToBack: this.backToBack,
      level: this.level,
      perfectClear,
    });
    if (cleared > 0) this.lines += cleared;
    this.recordStats(cleared, tSpin, perfectClear);
    this.combo = nextCombo(this.combo, cleared);
    this.backToBack = nextBackToBack(this.backToBack, cleared, tSpin);
    this.board = board;
    this.current = null;
    this.canHold = true;
    this.lastWasRotate = false;
    if (this.status === "playing") this.spawnPiece();
  }

  private recordStats(cleared: number, tSpin: TSpinKind, perfectClear: boolean): void {
    if (tSpin === "full") this.stats.tSpins += 1;
    if (tSpin === "mini") this.stats.tSpinMinis += 1;
    if (cleared === 4) this.stats.tetrises += 1;
    if (perfectClear) this.stats.perfectClears += 1;
    if (cleared > 0 && this.backToBack && (cleared === 4 || tSpin !== "none")) {
      this.stats.b2bClears += 1;
    }
    const comboAfter = nextCombo(this.combo, cleared);
    if (comboAfter > this.stats.maxCombo) this.stats.maxCombo = comboAfter;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

function emptyStats(): GameStats {
  return {
    holds: 0,
    tSpins: 0,
    tSpinMinis: 0,
    maxCombo: 0,
    b2bClears: 0,
    perfectClears: 0,
    tetrises: 0,
  };
}
