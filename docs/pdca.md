# PDCA

## Cycle 1

- **Hypothesis:** If AI talks only to `TetrisGameAdapter`, the browser engine can keep the same inputs and scores.
- **Implementation:** `TetrisAICore`, `ControlLoop`, `BrowserGameAdapter`; `AIPlayer.tick` takes an adapter, not `GameEngine`.
- **Measurement:** Existing engine/AI tests still pass. Closed-loop core test places pieces through the adapter. Benchmark (5 seeds, 40 pieces): 1-ply avg lines **13.80**, avg decision **0.66 ms**.
- **Problem:** Core was still unproven on pixels and on a controller-shaped output.
- **Improvement:** Add vision Observe PoC and a recording pad adapter.

## Cycle 2

- **Hypothesis:** Sampling the lower-middle of each cell avoids highlight pixels and yields ~100% board recovery on our renderer.
- **Implementation:** Pixel renderer matching cell colors; 5×5 average at (0.5, 0.62) inside each cell; nearest tetromino RGB.
- **Measurement:** 1000 random boards → **200000 / 200000 cells correct (100%)**, avg detect **0.044 ms**. Floating piece split **200 / 200**.
- **Problem:** A falling piece that already touches the stack merges with the grounded component (4-connected), so vision cannot always split it. NEXT is not on the matrix canvas.
- **Improvement:** Keep engine adapter as the play observer; use vision as a parallel debug observer. Document the touch-stack limitation.

## Cycle 3

- **Hypothesis:** When vision recovers board + current piece, 1-ply targets equal engine-state targets. 2-ply should beat 1-ply on the same seeds.
- **Implementation:** Vision → `TetrisAICore.plan` vs ground-truth plan (50 cases). Benchmark 1-ply vs 2-ply.
- **Measurement:** Decide match **50 / 50**. 2-ply: avg lines **14.80**, avg score **3551.6**, avg decision **16.2 ms** vs 1-ply **13.80 / 3215.2 / 0.66 ms** (same 5 seeds, 40 pieces).
- **Problem:** T-spin / perfect-clear rates stay 0; evaluator does not look for them. 40-piece cap hides game-over rate.
- **Improvement:** Keep default search at 2-ply. Leave T-spin / hold / beam search as Strategy/Search extension points. Do not change the live heuristic weights in this pass (behavior freeze).
