# Phase 3 — Future Setup Evaluation

Expert-replay agreement was **not** the adoption target. Keep/revert used 5×40 / 5×100 / 10×100 vs the Phase 2 live freeze.

`DEFAULT_WEIGHTS` and 2-ply were not modified. Experimental terms live in `src/ai/future.ts` behind flags that stay **OFF**.

## 1. Frozen Phase 2 baseline (this run)

Same adopted config: Beam 3×12, gated Hold ON, well/I ON, overhang OFF.

| Protocol | Lines | Score | GameOver | p50 ms | p95 ms | max ms | Nodes | Holds |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 5×40 | 15.00 | 3704.2 | 0 | 35.2 | 38.1 | 67.9 | 1637 | 0.00 |
| 5×100 | 39.00 | 15554.2 | 0 | 35.1 | 36.6 | 67.8 | 1647 | 0.20 |
| 10×100 | **38.90** | **15722.1** | 0 | 35.4 | 39.4 | 72.1 | 1643 | 0.10 |

p95 is a few ms above the Phase 2 write-up (37.3) on this machine; lines/score match Phase 2 exactly.

## 2. Cycle 1 — General Future Setup

**PLAN:** Leaf bonus for 1-step / 2-step surface (S/Z/J/L benches) and a penalty for non-well cliffs (`Δh≥3`), excluding the tetris-well edge so well/I reservation is not restacked. No empty-cell occupancy proxy. No move generation.

**DO:** `futureSetup` + `SETUP_{SMALL,MEDIUM,LARGE}`.

**CHECK (5×40 weight sweep vs 15.00 / 3704.2):**

| Weight | Lines | Score | p95 | actSetup / decision |
|---|---:|---:|---:|---:|
| small | **14.80** | 3663.8 | 48.9 | 1598 |
| medium | **14.80** | 3612.6 | 49.1 | 1599 |
| large | **14.80** | 3628.0 | 49.0 | 1599 |

**ACT: FAIL — REVERT.** Every weight lost 0.20 lines on 5×40. Activation ~1600/search (almost every expanded child) — the 1-step term is not selective; it restacks bumpiness and flattened play.

## 3. Cycle 2 — T-spin Setup Potential

**PLAN:** Cheap 3-corner T-notch (depth 1–2, not the tetris well). Small weight because Phase 1 had **zero** T-spin-setup evidence. A/B, do not force T-spins.

**DO:** `tspinSetup` + `TSPIN_{SMALL,MEDIUM,LARGE}`.

**CHECK (5×40 sweep):**

| Weight | Lines | Score | p95 | actTspin / decision |
|---|---:|---:|---:|---:|
| small | 15.00 | 3704.2 | 49.5 | 134 |
| medium | **14.60** | 3559.4 | 49.2 | 138 |
| large | **14.80** | 3674.8 | 49.8 | 143 |

Small was 5×40-viable (tie). Full protocol:

| Protocol | Lines | Score | p95 |
|---|---:|---:|---:|
| 5×40 | 15.00 | 3704.2 | **50.3** |
| 5×100 | 39.00 | 15554.2 | **52.8** |
| 10×100 | **38.70** | **15107.8** | **51.3** |

**ACT: FAIL — REVERT.** 10×100 lines and score dropped. p95 ≥ 50 ms. tSpins stayed 0.00 — the notches were not real T-spin setups. Phase 1’s lack of evidence was confirmed.

## 4. Cycle 3 — Future Line-Clear Potential

**PLAN:** Almost-full rows (9-fill / 8-fill) **excluding** tetris-well columns so this does not double-count well/I or immediate `linesCleared`.

**DO:** `futureClear` + `CLEAR_{SMALL,MEDIUM,LARGE}`.

**CHECK (5×40 sweep vs 15.00 / 3704.2):**

| Weight | Lines | Score | p95 | actClear / decision |
|---|---:|---:|---:|---:|
| small | **14.80** | 3620.8 | **51.0** | 876 |
| medium | **14.80** | 3625.0 | **50.0** | 880 |
| large | **14.80** | 3680.4 | **50.6** | 884 |

**ACT: FAIL — REVERT.** Lines down, p95 ≥ 50. Depth 3 already sees near-term clears; the leaf term delayed real singles.

## 5. Adopted features

**None.** Live config remains Phase 2:

```
Beam 3×12, root-complete
unconditional Hold = OFF
gated Hold = ON
well / I reservation = ON
surface / overhang = OFF
future setup / T-slot / future clear = OFF
DEFAULT_WEIGHTS unchanged
```

## 6. Reverted features

- General future setup (all weights)
- T-spin setup potential (all weights; small went to full protocol and failed)
- Future line-clear (all weights)

Code stays behind flags for a later, narrower attempt.

## 7. Benchmark comparison

| Version | Lines 5×40 | Lines 5×100 | Lines 10×100 | Score 10×100 | GameOver | p95 |
|---|---:|---:|---:|---:|---:|---:|
| Phase 2 Frozen | 15.00 | 39.00 | **38.90** | **15722.1** | 0 | 39.4 |
| + Future Setup (best 5×40) | 14.80 | — | — | — | 0 | 48.9 |
| + T-spin Setup small | 15.00 | 39.00 | 38.70 | 15107.8 | 0 | 51.3 |
| + Future Clear (best 5×40) | 14.80 | — | — | — | 0 | 50.0 |

## 8. Latency impact

Computing `findTetrisWell` + row scans on every placement added ~12 ms p95 even when the policy did not change (T-spin small, 5×40 tie). That alone violates the 50 ms goal on the full protocol. Caching would be required before retrying; it would not have saved Cycle 1/3, which also lost lines.

## 9. Feature activation statistics

| Feature | Activations / decision (approx) | Interpretation |
|---|---:|---|
| Future setup | ~1600 | Fires on nearly every child — not a setup detector |
| T-slot | ~130–140 | Some notches exist; they did not produce T-spins |
| Future clear | ~880 | Almost-full rows are common; over-valued vs taking a line now |

## 10. Failure cases

- **Non-selective surface term:** 1-step benches exist on any reasonable stack. Rewarding them flattened 5×40 from 15.00 → 14.80.
- **T-notch ≠ T-spin:** small weight was decision-neutral short-term, then lost 0.20 lines and ~614 score on 10×100. Zero T-spins in the log.
- **Future-clear vs 3-ply search:** leaf “almost 9” fights immediate `linesCleared` (weight 0.76).
- **Cost:** extra geometry on every node pushed p95 from ~38 ms to ~49–53 ms.

## 11. Remaining hypotheses

- Cache well detection per board; only then retry a **tiny** T-slot weight if 10×100 is re-measured with p95 < 50. Unlikely to help given the score drop.
- Setup value that is **relative to the parent** (did this placement destroy a well / create a hole) rather than an absolute surface histogram.
- Combo / B2B continuation still untested (Phase 1 had almost no B2B signal).
- Real expert video still missing; do not grow T-spin setup from the guideline fixture.

## 12. Next recommended experiment

Do **not** add more leaf bonuses that fire on every stack.

Next bottleneck is still **evaluator structure that Phase 2 already improved** (well/I) plus **gated Hold rarity**. Stronger candidates:

1. Relative “setup destroyed?” vs parent node (delta features), not absolute histograms.
2. Danger / maxHeight piecewise term (Phase 1 downstack had no fixture evidence — only if garbage is added).
3. Attach a real expert mp4 and re-measure T-spin frequency before any T-slot retry.
