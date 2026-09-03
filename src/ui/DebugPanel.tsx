import { FEATURE_KEYS } from "../ai/types";
import type { EvalWeights, SearchResult } from "../ai/types";

interface DebugPanelProps {
  result: SearchResult | null;
  weights: EvalWeights;
  vision?: {
    cellsCorrect: number;
    cellsTotal: number;
    elapsedMs: number;
    pieceMatch: boolean;
  } | null;
}

export function DebugPanel({ result, weights, vision }: DebugPanelProps) {
  const chosen = result?.candidates[0] ?? null;
  const top = result?.candidates.slice(0, 8) ?? [];

  return (
    <section className="debug-panel">
      <header>
        <h2>AI DEBUG</h2>
        <span>
          {result ? `${result.elapsedMs.toFixed(2)} ms` : "waiting"}
          {vision
            ? ` · vision ${vision.cellsCorrect}/${vision.cellsTotal} (${vision.elapsedMs.toFixed(2)} ms)`
            : ""}
        </span>
      </header>
      <div className="debug-grid">
        <div className="debug-card">
          <h3>Selected move</h3>
          <dl>
            <div>
              <dt>Rotation</dt>
              <dd>{result?.move ? result.move.rotation : "—"}</dd>
            </div>
            <div>
              <dt>X</dt>
              <dd>{result?.move ? result.move.x : "—"}</dd>
            </div>
            <div>
              <dt>Y</dt>
              <dd>{result?.move ? result.move.y : "—"}</dd>
            </div>
            <div>
              <dt>Hold</dt>
              <dd>{result?.move?.hold ? "YES" : "NO"}</dd>
            </div>
            <div>
              <dt>Score</dt>
              <dd>{result ? result.bestScore.toFixed(3) : "—"}</dd>
            </div>
            <div>
              <dt>Depth</dt>
              <dd>{result ? String(result.depth) : "—"}</dd>
            </div>
            <div>
              <dt>Nodes</dt>
              <dd>{result?.nodes ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="debug-card">
          <h3>Chosen features</h3>
          <dl>
            {FEATURE_KEYS.map((key) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{chosen ? formatNum(chosen.features[key]) : "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="debug-card">
          <h3>Weights</h3>
          <dl>
            {FEATURE_KEYS.map((key) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{formatNum(weights[key])}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="debug-card debug-candidates">
          <h3>Candidate scores</h3>
          <table>
            <thead>
              <tr>
                <th>h</th>
                <th>rot</th>
                <th>x</th>
                <th>y</th>
                <th>score</th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 ? (
                <tr>
                  <td colSpan={5}>No candidates yet</td>
                </tr>
              ) : (
                top.map((candidate, index) => (
                  <tr key={`${candidate.placement.rotation}-${candidate.placement.x}-${index}`}>
                    <td>{candidate.placement.hold ? "H" : ""}</td>
                    <td>{candidate.placement.rotation}</td>
                    <td>{candidate.placement.x}</td>
                    <td>{candidate.placement.y}</td>
                    <td>{candidate.score.toFixed(3)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}
