# Phase 5-A — Beam Width Sensitivity Diagnostic

**Diagnostic only.** Production configuration was not changed.

## 1. Frozen baseline

```text
Beam depth = 3
Beam width = 12
root-complete = true
gated Hold = ON
well / I reservation = ON
future / delta flags = OFF
DEFAULT_WEIGHTS unchanged
```

Reference (this run, width 12):

| Protocol | Lines | Score | GameOver | p50 ms | p95 ms |
|---|---:|---:|---:|---:|---:|
| 5×40 | 15.00 | 3704.2 | 0 | 31.3 | 32.6 |
| 5×100 | 39.00 | 15554.2 | 0 | 31.3 | 32.6 |
| 10×100 | **38.90** | **15722.1** | 0 | 31.4 | 33.2 |

## 2. Experimental methodology

- **Variable:** `beamWidth` ∈ {4, 8, 12, 16, 24, 32}
- **Fixed:** depth 3, all evaluator weights, gated Hold, well/I, seeds, protocols (5×40, 5×100, 10×100)
- **Same-state move probe:** On the width-12 game trajectory, every width was queried on the **identical board** before each placement (5 seeds × 40 pieces = 200 decisions)
- **Expert fixture:** Guideline-expert labeled fixture, 64 placements, seed 1 — **diagnostic only, not ground truth**
- **Diversity:** Root candidate list at width 12 on each probed decision

No depth increase, no new eval features, no Diversity Beam.

## 3. Real-game benchmark table

| Width | Lines 5×40 | Score 5×40 | Lines 5×100 | Score 5×100 | Lines 10×100 | Score 10×100 | GO 10×100 | p50 | p95 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 4 | 14.80 | 3597.6 | 38.60 | 15653.2 | 38.50 | 15077.0 | 0 | 26.2 | 27.2 |
| 8 | 15.00 | 3614.2 | 38.40 | 14111.2 | 38.60 | 14194.6 | 0 | 28.6 | 29.8 |
| **12** | **15.00** | **3704.2** | **39.00** | **15554.2** | **38.90** | **15722.1** | 0 | 31.3 | 33.2 |
| 16 | 14.80 | 3708.0 | 38.60 | 14761.2 | 38.80 | 14741.9 | 0 | 33.9 | 35.2 |
| 24 | 15.00 | 3742.0 | 38.80 | 14946.0 | 38.70 | 14785.2 | 0 | 39.1 | 41.0 |
| 32 | 15.00 | 3728.2 | 38.80 | 14985.4 | 38.90 | 15578.2 | 0 | 44.7 | 47.0 |

**Width 12 has the highest 10×100 score and ties the highest lines.** Wider beams do not beat it on the primary protocol.

## 4. Expert diagnostic (fixture only)

| Width | Top-1 | Top-3 | Top-5 | Top-10 | Outside beam | Avg rank |
|---:|---:|---:|---:|---:|---:|---:|
| 4 | 28.1% | 40.6% | 43.8% | 59.4% | 14.1% | 8.11 |
| 8 | 23.4% | 37.5% | 37.5% | 54.7% | 14.1% | 9.00 |
| 12 | 21.9% | 34.4% | 34.4% | 54.7% | 14.1% | 9.16 |
| 16 | 20.3% | 32.8% | 34.4% | 54.7% | 14.1% | 9.49 |
| 24 | 18.8% | 31.3% | 35.9% | 56.3% | 14.1% | 9.44 |
| 32 | 18.8% | 34.4% | 39.1% | 56.3% | 14.1% | 8.91 |

Expert top-1 **falls** as width increases (28.1% → 18.8%). Outside-beam rate is constant (14.1%) — width does not bring expert moves into the candidate set. **Not adoption evidence.**

## 5. Same-state move change vs width 12

On identical boards along the width-12 trajectory:

| Width | Differs from w12 | Avg rank of wN pick in w12 list | Outside w12 candidates |
|---:|---:|---:|---:|
| 4 | **8.0%** | 2.58 | 0 / 200 |
| 8 | 3.5% | 2.50 | 0 / 200 |
| 16 | **1.5%** | 2.50 | 0 / 200 |
| 24 | 4.5% | 2.79 | 0 / 200 |
| 32 | 4.5% | 2.79 | 0 / 200 |

When a wider (or narrower) beam picks a different move, that move is **already in width-12’s root candidate list** at rank ~2–3. No wider beam ever selected a trajectory outside the w12 root pool on these 200 decisions.

**Interpretation:** Deeper beam layers (width > 12) occasionally reorder which root placement wins, but they do not discover materially new root actions. Most play is unchanged.

## 6. Candidate diversity at width 12

200 decision samples (5×40 seeds on w12 trajectory):

| Metric | Value |
|---|---:|
| Avg root candidates | 34.5 |
| Avg unique placements | 34.5 |
| Avg unique (hold, rotation, x) | 34.5 |
| Avg hold-branch candidates | 0.17 |
| Near-duplicate rate (same rot+x+hold) | **0.0%** |
| Line-clear histogram (all root cands) | 0-line: 6703, 1-line: 178, 2-line: 11, 3/4: 0 |

Root-complete search already keeps **every legal root placement** (~34 on average). `beamWidth` only prunes **depth 2–3** leaves. The beam is not crowded with near-duplicate roots; the bottleneck is not root diversity at width 12.

## 7. Width vs latency

| Width | p50 ms | p95 ms | Avg nodes / decision |
|---:|---:|---:|---:|
| 4 | 26.2 | 27.2 | 1364 |
| 8 | 28.6 | 29.8 | 1503 |
| 12 | 31.3 | 33.2 | 1643 |
| 16 | 33.9 | 35.2 | 1782 |
| 24 | 39.1 | 41.0 | 2060 |
| 32 | 44.7 | **47.0** | 2336 |

Latency scales roughly linearly with width. Width 32 approaches the 50 ms comfort zone without game benefit.

## 8. Interpretation — **Case B: Width saturation**

| Criterion | Observation |
|---|---|
| Lines ↑ at 10×100? | **No** — w12 best (38.90); w32 ties lines but lower score |
| Score ↑ at 10×100? | **No** — w12 best (15722); w16/w24 lose ~1000 pts |
| GameOver? | 0 at all widths |
| Expert ↑ but games flat? | **Opposite** — expert top-1 ↓ as width ↑ |
| 40-piece ↑, 100-piece ↓? | w24/w32 can beat w12 on 5×40 score but **lose** on 10×100 score |

> **Beam width = 12 is not the primary bottleneck.** Wider beams mostly retain redundant depth-2/3 trajectories and sometimes pick a worse root (already ranked ~2–3 at w12). Narrower beams (4, 8) lose lines/score on long games.

Root-complete first ply means increasing width does **not** add root placements — it only keeps more leaf paths alive deeper in the tree. Those extra paths rarely change the chosen move (1.5–8% same-state) and do not improve 10×100 performance.

## 9. Recommendation for Phase 5-B

**Do not adopt width 16 or wider.** Do not run a width-increase experiment as the next step.

If Phase 5 continues, better directions:

1. **Depth diagnostic (5-B)** — is depth 3 the limit, not width? (separate phase; not done here)
2. **Evaluator / structure** — Phase 2 well/I + gated Hold remain the live gains; Phase 3/4 leaf/delta work failed
3. **Root scoring quality** — when w16/w24 change the pick (1.5–4.5% of decisions), they choose a lower-ranked root; investigate *why* deeper leaves prefer worse roots (tie-breaking, path mechanics), not more leaves

## 10. Deliverables checklist

| Item | Status |
|---|---|
| Production configuration unchanged | **YES** (`DEFAULT_BEAM.beamWidth` = 12) |
| `npm test` | **PASS** |
| `npm run build` | **PASS** |
| Diagnostic runner | `src/bench/phase5.ts`, `npm run bench:phase5` |

## 11. Answer to the core question

> Is Beam width = 12 actually too narrow?

**No.** On identical piece sequences, width 12 already evaluates all root placements. Wider widths change fewer than 5% of same-state decisions, never leave the w12 candidate pool, and **do not improve** 10×100 lines or score. The live width-12 setting is appropriate; search width is saturated for this depth-3 root-complete configuration.
