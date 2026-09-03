import { DebugPanel } from "./ui/DebugPanel";
import { BoardCanvas } from "./ui/BoardCanvas";
import { MiniPiece } from "./ui/MiniPiece";
import { useTetris } from "./hooks/useTetris";

export default function App() {
  const {
    snapshot,
    aiEnabled,
    setAiEnabled,
    debugEnabled,
    setDebugEnabled,
    searchMode,
    searchDepth,
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
  } = useTetris();

  const playing = snapshot.status === "playing";
  const paused = snapshot.status === "paused";
  const over = snapshot.status === "gameover";
  const ready = snapshot.status === "ready";

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="kicker">BROWSER TETRIS</p>
          <h1>TETRIS AI</h1>
        </div>
        <div className={`status-badge ${aiEnabled && playing ? "live" : ""}`}>
          {over
            ? "GAME OVER"
            : paused
              ? "PAUSED"
              : aiEnabled && playing
                ? "AI PLAYING"
                : playing
                  ? "HUMAN PLAYING"
                  : "READY"}
        </div>
      </header>

      <main className="layout">
        <section className="stage">
          <BoardCanvas
            board={snapshot.board}
            current={snapshot.current}
            ghost={snapshot.ghost}
            onFrame={debugEnabled ? onCanvasFrame : undefined}
          />
          {(paused || over || ready) && (
            <div className="overlay">
              <strong>{over ? "GAME OVER" : paused ? "PAUSED" : "PRESS START"}</strong>
              <span>
                {over
                  ? "Restart to play again"
                  : paused
                    ? "Resume to continue"
                    : "AI or human control"}
              </span>
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="previews">
            <div className="panel-block">
              <h2>HOLD</h2>
              <div className="next-box">
                <MiniPiece type={snapshot.hold} />
              </div>
            </div>
            <div className="panel-block">
              <h2>NEXT</h2>
              <div className="next-box">
                <MiniPiece type={snapshot.next} />
              </div>
            </div>
          </div>

          <div className="stats">
            <Stat label="Score" value={snapshot.score.toLocaleString()} />
            <Stat label="Level" value={snapshot.level} />
            <Stat label="Lines" value={snapshot.lines} />
            <Stat label="REN" value={snapshot.combo} />
            <Stat label="B2B" value={snapshot.backToBack ? "ON" : "OFF"} />
            <Stat label="Current" value={snapshot.current?.type ?? "—"} />
          </div>

          <div className="controls">
            <button type="button" className="primary" onClick={start} disabled={playing}>
              START
            </button>
            {paused ? (
              <button type="button" onClick={resume}>
                RESUME
              </button>
            ) : (
              <button type="button" onClick={pause} disabled={!playing}>
                PAUSE
              </button>
            )}
            <button type="button" onClick={restart}>
              RESTART
            </button>
          </div>

          <div className="toggles">
            <Toggle
              label="AI"
              on={aiEnabled}
              onToggle={() => setAiEnabled((value) => !value)}
            />
            <Toggle
              label="DEBUG"
              on={debugEnabled}
              onToggle={() => setDebugEnabled((value) => !value)}
            />
          </div>

          <div className="depth">
            <span>Search</span>
            <div>
              <button
                type="button"
                className={searchMode === "ply" && searchDepth === 1 ? "active" : ""}
                onClick={() => selectPly(1)}
              >
                1-PLY
              </button>
              <button
                type="button"
                className={searchMode === "ply" && searchDepth === 2 ? "active" : ""}
                onClick={() => selectPly(2)}
              >
                2-PLY
              </button>
              <button
                type="button"
                className={searchMode === "beam" ? "active" : ""}
                onClick={selectBeam}
              >
                BEAM
              </button>
            </div>
          </div>

          <p className="help">
            Human: ← → move, ↑/X rotate, Z reverse, ↓ soft drop, Space hard drop, C/Shift hold, P
            pause, R restart
          </p>
        </aside>
      </main>

      {debugEnabled && <DebugPanel result={debug} weights={weights} vision={vision} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Toggle({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className={`toggle ${on ? "on" : ""}`} onClick={onToggle}>
      <span>{label}</span>
      <em>{on ? "ON" : "OFF"}</em>
    </button>
  );
}
