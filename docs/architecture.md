# Architecture

```text
Observe(GameState)
    ↓
Think(PlySearch | BeamSearch + Evaluator + Strategy)
    ↓
Plan(Action[])
    ↓
Act(Input Adapter)
    ↓
Game
```

```text
Browser Game
    ↓
Browser Adapter
    ↓
TetrisGameState
    ↓
Tetris AI Core
    ↓
TetrisAction
    ↓
Browser Adapter
    ↓
GameEngine.input()
```

## GameState

`TetrisGameState` carries `board`, `current`, `nextPieces`, `holdPiece`, `canHold`, `combo` (REN), `backToBack`, and extras (score / lines / level).

## Search

- **PlySearch** — frozen 1-ply / 2-ply baseline (`findBestMove`). Does not hold. `DEFAULT_WEIGHTS` are unchanged.
- **BeamSearch** — root-complete first ply (so depth 2 matches 2-ply), then top-K at deeper plies. Unconditional Hold is off. **Gated Hold** opens a Hold branch only for I-save / tetris-well cases. Leaf eval adds a tetris-well / I-reservation term. Surface/overhang was A/B’d and reverted.

Default live search: Beam depth 3, width 12, gated Hold on, well/I reservation on, mechanics weights on.

## Candidate evaluation

Board features stay on `DEFAULT_WEIGHTS`. Additive mechanics (`mechanicsScore`): T-spin, mini, REN, B2B, perfect clear, hold-I, hold penalty.

## Mechanics (pure)

`src/core/mechanics/` — `applyHold`, `detectTSpin`, `nextCombo`, `nextBackToBack`, `lockScore`. No React/DOM.

## Closed loop

`ControlLoop`: Observe → Think → Plan → Act. One live input per tick through `GameEngine.input()`. HOLD is a first-class action; after HOLD the falling piece id changes and the loop replans.

## What AI Core does not depend on

React, DOM, Canvas, a specific commercial game, or a specific controller driver.
