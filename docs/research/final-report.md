# Tetris AI — Final Research Report

**Status: COMPLETE — production frozen at Beam depth 3 × width 12.**

This document is the definitive summary of the Tetris AI research program. No further heuristic or search experiments are planned in this repository.

---

## 1. Project objective

Build a **browser-playable Tetris AI** that:

- Observes game state through a clean `GameState` abstraction
- Plans placements via search + heuristic evaluation
- Acts through normal game inputs (rotate, move, hard drop, hold)
- Does **not** rely on memory reading, process injection, or hidden game state

Success is measured by **seeded real-game benchmarks** (lines, score, GameOver, latency), not expert-replay imitation.

---

## 2. Architecture

```text
Browser UI
  ↓
GameEngine (rules, scoring, pieces)
  ↓
BrowserGameAdapter → TetrisGameState
  ↓
ControlLoop: Observe → Think → Plan → Act
  ↓
TetrisAICore + BeamSearch / PlySearch
  ↓
Evaluator + Strategy + Mechanics (Hold, T-spin, REN, B2B)
  ↓
Action[] (rotate, move, hardDrop, hold)
  ↓
BrowserGameAdapter.press → GameEngine.input()
```

AI Core is independent of React, Canvas, and browser specifics. External-game connection remains a **local recording PoC** only.

---

## 3. Search design

| Parameter | Production value | Notes |
|---|---|---|
| Algorithm | Beam Search | Root-complete first ply |
| Depth | **3** | Final depth experiment rejected depth 4 |
| Width | **12** | Phase 5-A: width saturation; wider does not help |
| Hold | Gated (not unconditional) | Opens for I-save / tetris well only |
| Spins | ON | Grounded spin placements in move gen |
| 2-ply baseline | Preserved | Separate code path for comparison |

**Root-complete:** Every legal root placement is evaluated before beam pruning at deeper levels (~34 candidates on average). Increasing width only keeps more depth-2/3 leaf paths; it does not add root moves.

**Hold handling:** `useHold=false` at config level; `useGatedHold=true` explores Hold only when `shouldExploreHold()` passes (well + I availability). Unconditional Hold was measured and **rejected** (12 holds/game, lines collapse).

---

## 4. Evaluation design

### ADOPTED (in `DEFAULT_WEIGHTS` + structure terms)

| Feature | Role |
|---|---|
| `linesCleared` | Immediate clear value (weight 0.76) |
| `holes`, `aggregateHeight`, `bumpiness`, `maxHeight` | Stack quality |
| `wells` | General well penalty |
| `density`, `rowTransitions`, `colTransitions` | Shape regularity |
| **Well / I reservation** | Leaf bonus for 1-wide tetris well + I in hold/next; offsets wells penalty for that column |
| **Mechanics weights** | T-spin, combo/REN, B2B, perfect clear, hold-I (beam path only) |

### REJECTED (flags exist for reproducibility; all OFF in production)

| Feature | Phase | Why rejected |
|---|---|---|
| Unconditional Hold | 2 | 12 holds/game; lines 15.00 → 10.20 |
| Surface / overhang | 2 | Score collapse on 10×100 |
| `futureSetup` | 3 | Fires on ~100% of children; 5×40 lines −0.20 |
| `tspinSetup` | 3 | No T-spins; 10×100 score −614; p95 ≥ 50 ms |
| `futureClear` | 3 | Almost-full rows too common; lines −0.20 |
| `wellDelta` | 4 | Create-side overfit; 10×100 lines −0.10 |
| `holeDelta` | 4 | 73% activation; score −517 |
| `surfaceDelta` | 4 | 92% activation; 10×100 score −1088 |
| Beam width > 12 | 5-A | Width 12 best 10×100 score; wider never leaves w12 root pool |
| Beam depth 4 | Final | 10×100 lines 38.90 → 38.70; 5×40 lines 15.00 → 14.80 |

---

## 5. Research history

### Phase 1 — Expert replay analysis

- **Hypothesis:** Guideline-expert fixture reveals gaps vs frozen Beam 3×12 (Hold off).
- **Experiment:** 64-step labeled fixture; rank expert moves in candidate list.
- **Result:** Top-1 agreement 21.9%; gaps in Hold (26%), future setup (22%), I-well (16%).
- **Decision:** Diagnostic only. No expert imitation. Real expert video not in repo.

### Phase 2 — Gated Hold + Well/I reservation

- **Hypothesis:** Gated Hold avoids unconditional Hold collapse; well/I leaf stops filling tetris wells.
- **Experiment:** Sequential A/B vs frozen Beam 3×12.
- **Result:** Gated Hold KEEP (+score, holds ~0.1/game). Well/I KEEP (10×100 lines 38.80→38.90, score 15617→15722). Surface/overhang REVERT.
- **Decision:** **Adopted** as live default.

### Phase 3 — Future leaf features

- **Hypothesis:** Absolute future-setup / T-slot / almost-clear leaf terms add horizon without depth increase.
- **Experiment:** A → B → C, one at a time.
- **Result:** All REVERT. Non-selective activation; latency +12 ms p95.
- **Decision:** Flags stay OFF.

### Phase 4 — Parent-relative delta features

- **Hypothesis:** Hinge-at-parent deltas avoid Phase 3’s “reward every stack” failure.
- **Experiment:** Well / hole / surface damage deltas.
- **Result:** All REVERT. Hole/surface still 73–92% active; well create overfit short games.
- **Decision:** Flags stay OFF.

### Phase 5-A — Beam width sensitivity

- **Hypothesis:** Width 12 may be too narrow.
- **Experiment:** Widths 4, 8, 12, 16, 24, 32; same-state move probe.
- **Result:** **Case B saturation.** Width 12 best 10×100 score (15722). Wider beams differ ≤8% same-state; never outside w12 root pool.
- **Decision:** Width stays 12.

### Final — Search depth sensitivity

- **Hypothesis:** Depth 4 may improve 100-piece play without new heuristics.
- **Experiment:** Depths 1, 2, 3, 4; width 12; frozen eval/Hold.
- **Result:** Depth 3 best on **lines**; depth 4 improves score (+264) but **loses lines** (−0.20 on 10×100, −0.20 on 5×40). d3→d4 root change 28.5% same-state. p95 depth 4 = 40.5 ms (< 80 ms).
- **Decision:** **REJECT depth 4.** Retain depth 3.

---

## 6. Failed hypotheses (explicit)

1. Unconditional Hold improves long-horizon play → **false**
2. Absolute future-setup leaf terms help at depth 3 → **false**
3. T-spin setup notches help without real T-spin evidence → **false**
4. Parent-relative hole/surface deltas are selective enough → **false**
5. Beam width > 12 improves real games → **false**
6. Beam depth 4 improves the primary benchmark → **false** (lines regress)

---

## 7. Final configuration

```text
FINAL CONFIGURATION (FROZEN)

Algorithm:     Beam Search
Depth:         3
Width:         12
Root-complete: true

Unconditional Hold:  OFF
Gated Hold:          ON
Well / I reservation: ON

futureSetup:   OFF
tspinSetup:    OFF
futureClear:   OFF
wellDelta:     OFF
holeDelta:     OFF
surfaceDelta:  OFF
surfaceOverhang: OFF

DEFAULT_WEIGHTS: unchanged
2-ply baseline:  unchanged (diagnostic)

Source of truth: DEFAULT_BEAM in src/core/beam.ts
                 PRODUCTION_FROZEN in src/bench/finalDepth.ts
```

---

## 8. Final benchmark

Production config re-run matches the Phase 2/3/4/5-A frozen baseline:

| Protocol | Lines | Score | GameOver | p50 ms | p95 ms |
|---|---:|---:|---:|---:|---:|
| 5×40 | 15.00 | 3704.2 | 0 | 31.2 | 32.5 |
| 5×100 | 39.00 | 15554.2 | 0 | 31.5 | 33.7 |
| 10×100 | **38.90** | **15722.1** | 0 | 31.3 | 32.8 |

### Depth experiment (final diagnostic)

| Depth | Lines 10×100 | Score 10×100 | p95 10×100 |
|---:|---:|---:|---:|
| 1 | 37.70 | 14433 | 0.8 |
| 2 | 38.50 | 15683 | 24.7 |
| **3** | **38.90** | **15722** | **32.8** |
| 4 | 38.70 | 15986 | 40.5 |

Depth 4: score +264 but lines −0.20 → **REJECTED**.

---

## 9. Performance

| Config | p50 | p95 | Notes |
|---|---:|---:|---|
| Production (d3 w12) | ~31 ms | ~33 ms | Browser action gap 55 ms |
| Depth 4 | ~39 ms | ~41 ms | Under 80 ms bound but not adopted |
| Width 32 | ~45 ms | ~47 ms | Not adopted (Phase 5-A) |

---

## 10. Safety / architecture constraints

This project does **NOT** use:

- Memory reading or game-process injection
- Anti-cheat bypass
- Puyo Puyo Tetris 2–specific internals
- Hidden/warped game state
- Online-play automation

Play path uses visible actions only: rotate, move, soft/hard drop, hold.

---

## 11. Limitations

- Benchmarks use **10 fixed seeds** — not a large statistical sample
- Expert fixture is **synthetic/guideline**, not a full real gameplay dataset
- Evaluator is **hand-tuned heuristic**, not learned
- No large-scale human-vs-AI validation
- T-spin setup rarely appears in benchmarks (tSpins ≈ 0)
- Depth 4 changes 28.5% of root decisions vs depth 3 but does not improve lines

---

## 12. Future research (questions only — not production changes)

- Real expert replay dataset (video + matched engine states)
- Human decision-gap analysis with labeled causes
- Learned evaluation (RL or imitation with proper datasets)
- Better T-spin recognition and setup **if** evidence shows T-spins in real play
- Adaptive search (variable depth/width by danger)
- Performance optimization (caching, incremental features) without policy change

> These are future research directions, not current production changes.

---

## Reproducibility

```bash
npm test
npm run build
npm run bench:final    # depth 1–4 diagnostic (FINAL=1)
npm run bench:phase5   # width sensitivity (PHASE5=1)
```

Reports: `docs/research/phase2-ab.md`, `phase3-future-setup.md`, `phase4-parent-delta.md`, `phase5-beam-width.md`, this file.

---

## STOP

Research program complete. Do not add Phase 6, new heuristics, or change `DEFAULT_WEIGHTS` / production depth / width without a new project charter.
