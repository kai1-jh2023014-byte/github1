# Architecture

```text
                 ┌─────────────────┐
                 │  Tetris AI Core │
                 │  think / plan   │
                 └────────┬────────┘
                          │ GameState → PlannedMove / Action[]
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
        Browser Adapter      External Adapter
                │                   │
                ▼                   ▼
          GameEngine          Virtual controller
                                  (recording PoC)
```

## Layers

1. **Board evaluation** (`src/ai/evaluator.ts`) — heuristic features and weights.
2. **Search** (`src/core/search.ts`) — `PlySearch` today, `BeamSearch` stub for later.
3. **Strategy** (`src/core/strategy.ts`) — `IdentityStrategy` now; T-spin / opener / garbage policies can rerank candidates later.

## Closed loop

`ControlLoop` (`src/core/loop.ts`):

Observe (`getState`) → Think (`search`) → Plan (`planActions`) → Act (`press`) → game → Observe.

The browser AI still executes **one live action per tick** (rotate / shift / hard drop) so wall-kicks and gravity stay honest. The planned `Action[]` is available for adapters that fire a burst.

## What AI Core does not depend on

React, DOM, Canvas, a specific commercial game, or a specific controller driver.
