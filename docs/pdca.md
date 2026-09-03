# PDCA

Previous adapter / vision cycles are summarized at the bottom.

## Cycle 1 — Mechanics

- **PLAN:** Hold, T-spin detection, REN, and B2B in Core/Engine let search see future value without changing 2-ply semantics.
- **DO:** `holdPiece` / `canHold`, `HOLD` action, 3-corner T-spin (`full` / `mini` / `none`; kick-table exceptions unsupported), combo reset, B2B on tetris/T-spin, benchmark stats.
- **CHECK:** Hold cases A–D pass. 2-ply 5×40: **avg lines 14.80**, score 3651.6 (combo points vs older 3551.6), holds 0, t-spins 0, p50 ~16 ms. `DEFAULT_WEIGHTS` unchanged.
- **ACT:** **PASS.** Baseline frozen. Mini vs full uses 3 vs 4 corners only.

## Cycle 2 — Search

- **PLAN:** Beam Search with hold branches beats 2-ply on long-horizon board quality.
- **DO:** `BeamSearch` (depth × width), hold × placements, spin moves, node/latency metrics.
- **CHECK (same seeds 1–5, 40 pieces):**

| Config | lines | score | p95 ms | holds |
|---|---:|---:|---:|---:|
| 2-ply | 14.80 | 3651.6 | ~18 | 0 |
| beam 2×8 + hold | 10.00 | 2114 | ~14 | 12 |
| beam 3×12 + hold | 10.20 | 2994 | ~38 | 12 |
| beam 3×12 no hold (pruned root) | 14.80 | 3647 | ~16 | 0 |
| beam 3×12 no hold (root-complete) | **15.00** | **3704** | ~35 | 0 |
| beam 3×16 no hold (root-complete) | 14.80 | 3708 | ~38 | 0 |
| beam 4×16 + hold | 10.00 | 4274 | ~72 | 12 |

- **ACT:** Hold-as-equal-candidate over-holds and **loses lines**. Root-complete beam 3×12 without hold **beats 2-ply**. Width 16/32 and extra depth were not better. **PASS** for search; hold stays optional and default-off.

## Cycle 3 — Strategy

- **PLAN:** Mechanics + Hold + Beam together beat board-only 2-ply.
- **DO:** Ablations: 2-ply, beam only, beam+hold, beam+mechanics. Hold penalty / root-only hold. `holdI` vs `holdPenalty`. Perfect-clear weight reduced (1.6 chased PCs and cut lines).
- **CHECK:**

| Protocol | 2-ply lines / score | Final beam 3×12+mech |
|---|---|---|
| 5 seeds × 40 | 14.80 / 3652 | **15.00 / 3704** |
| 5 seeds × 100 | 38.40 / 14405 | **39.00 / 15521** |
| 10 seeds × 100 | 38.40 / 14991 | **38.80 / 15617** |

Hold (even strict penalty) stayed below 2-ply (13.8 / 35.8 lines). Latency p95 ~37 ms vs 2-ply ~19 ms; under the 55 ms action gap.

- **ACT:** **PASS.** Final: BeamSearch depth 3, width 12, hold **off** (implemented, measured weaker), T-spin/REN/B2B weights **on**, root-complete first ply. Browser default is this config. 1-PLY / 2-PLY remain.

## Phase 2 — Gated Hold + Well/I (this cycle)

Details and tables: [docs/research/phase2-ab.md](research/phase2-ab.md).

### Cycle 1 — Gated Hold

- **PLAN:** Unconditional Hold loses lines. A board-feature gate (I-save / well-ready) might not.
- **DO:** `shouldExploreHold` — tetris well + I availability only. No expert-move cloning.
- **CHECK:** vs frozen 3×12. 5×40 tie 15.00/3704. 5×100 score 15521 → 15554. 10×100 score 15617 → 15633. Holds 0.10/game. p95 ~32 ms.
- **ACT:** **PASS — KEEP.**

### Cycle 2 — Well / I reservation

- **PLAN:** Evaluator penalizes all wells, so Beam fills a 1-wide well for a single.
- **DO:** Leaf `wellReservationScore` (depth 4–6 peak, I in hold/next, partial wells-penalty offset).
- **CHECK:** On top of gated Hold. 10×100 lines 38.80 → **38.90**, score 15617 → **15722**. p95 37 ms.
- **ACT:** **PASS — KEEP.** Adopted as live default with gated Hold.

### Cycle 3 — Surface / overhang

- **PLAN:** Bumpiness is adjacent-column only.
- **DO:** Overhang count on covered adjacent empties, −0.14 each.
- **CHECK:** 5×40 score 3704 → 3623. 10×100 lines 38.80 → 38.70, score 15617 → 14803.
- **ACT:** **FAIL — REVERT.**

### Adopted

Gated Hold ON, well/I ON, overhang OFF, unconditional Hold OFF, `DEFAULT_WEIGHTS` unchanged.

## Phase 3 — Future setup leaf eval

Details: [docs/research/phase3-future-setup.md](research/phase3-future-setup.md).

### Cycle 1 — Future setup (step histogram)

- **PLAN:** 1-step/2-step benches, jagged-cliff penalty, tetris-well edge excluded.
- **CHECK:** 5×40 all weights 14.80 vs frozen 15.00. Activation ~1600/decision.
- **ACT:** **FAIL — REVERT.**

### Cycle 2 — T-spin setup (3-corner notch)

- **PLAN:** Small T-slot bonus; Phase 1 had no T-spin-setup evidence.
- **CHECK:** small tied 5×40 then 10×100 38.70 / 15108 vs 38.90 / 15722. p95 > 50. tSpins 0.
- **ACT:** **FAIL — REVERT.**

### Cycle 3 — Future line-clear (almost-full rows)

- **PLAN:** 8/9-fill rows excluding well column.
- **CHECK:** 5×40 14.80, p95 ≥ 50.
- **ACT:** **FAIL — REVERT.**

Live default unchanged from Phase 2.

## Phase 4 — Parent-delta leaf eval

Details: [docs/research/phase4-parent-delta.md](research/phase4-parent-delta.md).

Hinge-at-parent terms (not absolute histograms). Parent well/holes/heights cached. p95 stayed ~33 ms.

### Cycle 1 — Well Delta

- **PLAN:** Destroy vs create of tetris-well shape quality; skip tetris fills; no unbounded depth.
- **CHECK:** medium 5×40 15.00/3724 then 10×100 38.80 / 15679 vs 38.90 / 15722.
- **ACT:** **FAIL — REVERT.**

### Cycle 2 — Hole Delta

- **PLAN:** Extra penalty for hole-count increase only.
- **CHECK:** small tied 5×40 then 10×100 score 15205 vs 15722. Active share 74%.
- **ACT:** **FAIL — REVERT.**

### Cycle 3 — Surface Damage Delta

- **PLAN:** New adjacent cliffs only; well edges excluded.
- **CHECK:** large 5×40 15.00/3726 then 10×100 38.60 / 14634. Active share 92%.
- **ACT:** **FAIL — REVERT.**

Live default unchanged from Phase 2/3.

## Regression

`npm test` / `npm run build` / AI PLAYING path through `GameEngine.input()`.

---

## Earlier cycles (adapter / vision)

### Cycle 1 (adapter)

If AI talks only to `TetrisGameAdapter`, the browser engine keeps the same inputs. Closed-loop core test places pieces through the adapter.

### Cycle 2 (vision)

1000 random boards → 200000 / 200000 cells. Floating piece split 200 / 200.

### Cycle 3 (vision vs 2-ply freeze)

Vision decide match 50 / 50. Then 2-ply 14.80 lines vs 1-ply 13.80 on 5×40. Weights frozen.
