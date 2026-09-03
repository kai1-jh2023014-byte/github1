import { useCallback, useEffect, useRef, useState } from "react";
import { AIPlayer, DEFAULT_MECHANICS, DEFAULT_WEIGHTS, ZERO_MECHANICS } from "../ai";
import type { SearchDepth, SearchResult } from "../ai";
import { DEFAULT_BEAM } from "../core/beam";
import { createBoard, GameEngine } from "../game";
import type { GameSnapshot } from "../game";
import { BrowserGameAdapter } from "../adapters/browser";
import { compareBoards, detectGameState, imageDataToBuffer } from "../vision";

const EMPTY_SNAPSHOT: GameSnapshot = {
  board: createBoard(),
  current: null,
  next: null,
  nextQueue: [],
  hold: null,
  canHold: true,
  combo: 0,
  backToBack: false,
  score: 0,
  level: 1,
  lines: 0,
  status: "ready",
  ghost: null,
  stats: {
    holds: 0,
    tSpins: 0,
    tSpinMinis: 0,
    maxCombo: 0,
    b2bClears: 0,
    perfectClears: 0,
    tetrises: 0,
  },
};

export type SearchMode = "ply" | "beam";

export function useTetris() {
  const engineRef = useRef<GameEngine | null>(null);
  const aiRef = useRef<AIPlayer | null>(null);
  const aiEnabledRef = useRef(true);

  const [snapshot, setSnapshot] = useState<GameSnapshot>(EMPTY_SNAPSHOT);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [debugEnabled, setDebugEnabled] = useState(true);
  const [searchMode, setSearchMode] = useState<SearchMode>("ply");
  const [searchDepth, setSearchDepth] = useState<SearchDepth>(2);
  const [debug, setDebug] = useState<SearchResult | null>(null);
  const [weights] = useState(DEFAULT_WEIGHTS);
  const [vision, setVision] = useState<{
    cellsCorrect: number;
    cellsTotal: number;
    elapsedMs: number;
    pieceMatch: boolean;
  } | null>(null);

  useEffect(() => {
    const engine = new GameEngine();
    const adapter = new BrowserGameAdapter(engine);
    const ai = new AIPlayer({
      weights,
      depth: 2,
      algorithm: "ply",
      onResult: (result) => setDebug(result),
    });
    ai.setEnabled(true);
    engineRef.current = engine;
    aiRef.current = ai;
    setSnapshot(engine.getSnapshot());
    const unsub = engine.subscribe(() => setSnapshot(engine.getSnapshot()));

    let raf = 0;
    const loop = (now: number) => {
      engine.tick(now);
      ai.tick(now, adapter);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [weights]);

  useEffect(() => {
    aiEnabledRef.current = aiEnabled;
    aiRef.current?.setEnabled(aiEnabled);
  }, [aiEnabled]);

  useEffect(() => {
    const ai = aiRef.current;
    if (!ai) return;
    ai.setAlgorithm(searchMode);
    if (searchMode === "beam") {
      ai.depth = Math.max(searchDepth, DEFAULT_BEAM.depth);
      ai.beamWidth = DEFAULT_BEAM.beamWidth;
      ai.useHold = true;
      ai.mechanicsWeights = DEFAULT_MECHANICS;
      if (searchDepth < DEFAULT_BEAM.depth) {
        ai.depth = DEFAULT_BEAM.depth;
      }
    } else {
      ai.depth = searchDepth;
      ai.useHold = false;
      ai.mechanicsWeights = ZERO_MECHANICS;
    }
    ai.resetPlan();
  }, [searchDepth, searchMode]);

  const start = useCallback(() => engineRef.current?.start(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const resume = useCallback(() => engineRef.current?.resume(), []);
  const restart = useCallback(() => {
    aiRef.current?.resetPlan();
    setDebug(null);
    engineRef.current?.restart();
  }, []);

  const togglePause = useCallback(() => {
    const status = engineRef.current?.getStatus();
    if (status === "paused") resume();
    else if (status === "playing") pause();
  }, [pause, resume]);

  const selectPly = useCallback((depth: 1 | 2) => {
    setSearchMode("ply");
    setSearchDepth(depth);
  }, []);

  const selectBeam = useCallback(() => {
    setSearchMode("beam");
    setSearchDepth(DEFAULT_BEAM.depth);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        togglePause();
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        restart();
        return;
      }

      if (aiEnabledRef.current) return;
      if (engine.getStatus() !== "playing") return;

      const keyActions: Record<string, () => void> = {
        ArrowLeft: () => engine.input("left"),
        ArrowRight: () => engine.input("right"),
        ArrowDown: () => engine.input("softDrop"),
        ArrowUp: () => engine.input("rotateCW"),
        x: () => engine.input("rotateCW"),
        X: () => engine.input("rotateCW"),
        z: () => engine.input("rotateCCW"),
        Z: () => engine.input("rotateCCW"),
        " ": () => engine.input("hardDrop"),
        c: () => engine.input("hold"),
        C: () => engine.input("hold"),
        Shift: () => engine.input("hold"),
      };
      const action = keyActions[event.key];
      if (!action) return;
      event.preventDefault();
      if (event.repeat && (event.key === " " || event.key === "Shift")) return;
      action();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [restart, togglePause]);

  const onCanvasFrame = useCallback(
    (image: ImageData) => {
      if (!debugEnabled) return;
      const engine = engineRef.current;
      if (!engine) return;
      const detected = detectGameState(imageDataToBuffer(image));
      const snap = engine.getSnapshot();
      const cmp = compareBoards(snap.board, detected.state.board);
      setVision({
        cellsCorrect: cmp.correct,
        cellsTotal: cmp.total,
        elapsedMs: detected.elapsedMs,
        pieceMatch: detected.state.current?.type === snap.current?.type,
      });
    },
    [debugEnabled],
  );

  return {
    snapshot,
    aiEnabled,
    setAiEnabled,
    debugEnabled,
    setDebugEnabled,
    searchMode,
    searchDepth,
    setSearchDepth,
    selectPly,
    selectBeam,
    debug,
    weights,
    vision,
    onCanvasFrame,
    start,
    pause,
    resume,
    restart,
    togglePause,
  };
}
