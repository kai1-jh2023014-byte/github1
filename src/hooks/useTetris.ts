import { useCallback, useEffect, useRef, useState } from "react";
import { AIPlayer, DEFAULT_WEIGHTS } from "../ai";
import type { SearchDepth, SearchResult } from "../ai";
import { createBoard, GameEngine } from "../game";
import type { GameSnapshot } from "../game";

const EMPTY_SNAPSHOT: GameSnapshot = {
  board: createBoard(),
  current: null,
  next: null,
  score: 0,
  level: 1,
  lines: 0,
  status: "ready",
  ghost: null,
};

export function useTetris() {
  const engineRef = useRef<GameEngine | null>(null);
  const aiRef = useRef<AIPlayer | null>(null);
  const aiEnabledRef = useRef(true);

  const [snapshot, setSnapshot] = useState<GameSnapshot>(EMPTY_SNAPSHOT);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [debugEnabled, setDebugEnabled] = useState(true);
  const [searchDepth, setSearchDepth] = useState<SearchDepth>(2);
  const [debug, setDebug] = useState<SearchResult | null>(null);
  const [weights] = useState(DEFAULT_WEIGHTS);

  useEffect(() => {
    const engine = new GameEngine();
    const ai = new AIPlayer({
      weights,
      depth: 2,
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
      ai.tick(now, engine);
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
    if (aiRef.current) {
      aiRef.current.depth = searchDepth;
      aiRef.current.resetPlan();
    }
  }, [searchDepth]);

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
      };
      const action = keyActions[event.key];
      if (!action) return;
      event.preventDefault();
      if (event.repeat && event.key === " ") return;
      action();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [restart, togglePause]);

  return {
    snapshot,
    aiEnabled,
    setAiEnabled,
    debugEnabled,
    setDebugEnabled,
    searchDepth,
    setSearchDepth,
    debug,
    weights,
    start,
    pause,
    resume,
    restart,
    togglePause,
  };
}
