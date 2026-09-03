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
    searchDepth,
    setSearchDepth,
    debug,
    weights,
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
          <div className="panel-block">
            <h2>NEXT</h2>
            <div className="next-box">
              <MiniPiece type={snapshot.next} />
            </div>
          </div>

          <div className="stats">
            <Stat label="Score" value={snapshot.score.toLocaleString()} />
            <Stat label="Level" value={snapshot.level} />
            <Stat label="Lines" value={snapshot.lines} />
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
            <span>Search depth</span>
            <div>
              <button
                type="button"
                className={searchDepth === 1 ? "active" : ""}
                onClick={() => setSearchDepth(1)}
              >
                1-PLY
              </button>
              <button
                type="button"
                className={searchDepth === 2 ? "active" : ""}
                onClick={() => setSearchDepth(2)}
              >
                2-PLY
              </button>
            </div>
          </div>

          <p className="help">
            Human: ← → move, ↑/X rotate, Z reverse, ↓ soft drop, Space hard drop, P pause, R restart
          </p>
        </aside>
      </main>

      {debugEnabled && <DebugPanel result={debug} weights={weights} />}
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
