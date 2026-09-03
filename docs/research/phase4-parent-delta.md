# Phase 4 — Parent-Delta Evaluation

Expert-replay agreement was **not** the adoption target. Keep/revert used 5×40 / 5×100 / 10×100 vs the Phase 3 live freeze.

`DEFAULT_WEIGHTS` and 2-ply were not modified. Experimental terms live in `src/ai/delta.ts` behind flags that stay **OFF**.

Linear `(child − parent)` of a feature already in the leaf score is a disguised weight change among siblings. These terms are **hinged at the parent** (destroy vs create treated differently). Parent heights / well / hole counts are cached on the beam node so children are not full-rescanned.

## 1. Frozen Phase 3 baseline (this run)

Same adopted config: Beam 3×12, gated Hold ON, well/I ON, overhang OFF, future leaf flags OFF.

| Protocol | Lines | Score | GameOver | p50 ms | p95 ms | max ms | Nodes |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5×40 | 15.00 | 3704.2 | 0 | 31.6 | 34.3 | 59.1 | 1637 |
| 5×100 | 39.00 | 15554.2 | 0 | 31.6 | 32.9 | 59.7 | 1647 |
| 10×100 | **38.90** | **15722.1** | 0 | 31.5 | 32.8 | 59.6 | 1643 |

Lines/score match Phase 2/3 exactly. p95 is lower than the Phase 3 write-up (~39 ms) because well reservation now reuses `evaluateBoard` heights instead of a second `columnHeights` scan. That refactor is live with flags off and does not change decisions.

## 2. Cycle 1 — Well Delta

**PLAN:** Hinge on tetris-well *shape quality* (same 4–6 peak as Phase 2, no unbounded deep-well reward, no I-hold restack). Destroy-only at small; tiny create at medium/large. Skip destroy penalty when the placement is a tetris (`cleared >= 4`). Parent well cached; child well reused from reservation.

**DO:** `wellDelta` + `WELL_{SMALL,MEDIUM,LARGE}`.

**CHECK (5×40 weight sweep vs 15.00 / 3704.2):**

| Weight | Lines | Score | p95 | actWell / decision | active share |
|---|---:|---:|---:|---:|---:|
| small (destroy only) | 15.00 | 3704.2 | 32.6 | 20.8 | 1.3% |
| medium | 15.00 | **3724.2** | 32.8 | 240.5 | 14.7% |
| large | 15.00 | 3724.2 | 32.4 | 240.5 | 14.7% |

Small is selective (1.3%). Medium/large fire create as well (~15%). Medium won the 5×40 sweep. Full protocol:

| Protocol | Lines | Score | p95 |
|---|---:|---:|---:|
| 5×40 | 15.00 | 3724.2 | 32.4 |
| 5×100 | **38.80** | **15467.8** | 32.8 |
| 10×100 | **38.80** | **15678.9** | 32.8 |

10×100 well-delta dist: n=1.64M, mean≈−0.0003, median=0, p95=0.024, pos=227390, neg=24293, active=15.3%.

**ACT: FAIL — REVERT.** 5×40 score rose; longer games lost 0.10 lines and ~43 score. Create-side reward overfit short games.

## 3. Cycle 2 — Hole Delta

**PLAN:** Extra penalty only for `max(0, childHoles − parentHoles)` at small (fill already in `DEFAULT_WEIGHTS.holes`). Parent hole count is the already-computed leaf feature — zero extra scans.

**DO:** `holeDelta` + `HOLE_{SMALL,MEDIUM,LARGE}`.

**CHECK (5×40 sweep):**

| Weight | Lines | Score | p95 | actHole / decision | active share |
|---|---:|---:|---:|---:|---:|
| small | 15.00 | 3704.2 | 32.7 | 1202 | **73.4%** |
| medium | **14.80** | 3685.8 | 33.1 | 1205 | 73.5% |
| large | **14.80** | 3685.8 | 32.7 | 1205 | 73.6% |

Small tied 5×40 but the definition is too broad (almost every child vs parent creates holes). Full protocol:

| Protocol | Lines | Score | p95 |
|---|---:|---:|---:|
| 5×40 | 15.00 | 3704.2 | 32.8 |
| 5×100 | 39.00 | **15468.0** | 32.7 |
| 10×100 | 38.90 | **15205.1** | 32.7 |

10×100 hole-delta dist: n=1.65M, mean=−0.225, median=−0.12, p95=0, pos=0, neg=1.21M, active=73.8%.

**ACT: FAIL — REVERT.** Lines tied on 10×100; score dropped ~517. Count-delta holes is not “newly created inaccessible holes” — it restacks the existing holes term on most children.

## 4. Cycle 3 — Surface Damage Delta

**PLAN:** Only *new* adjacent cliff growth; tetris-well edges excluded so this does not fight well/I. No absolute bumpiness / overhang count.

**DO:** `surfaceDelta` + `SURFACE_{SMALL,MEDIUM,LARGE}`.

**CHECK (5×40 sweep):**

| Weight | Lines | Score | p95 | actSurf / decision | active share |
|---|---:|---:|---:|---:|---:|
| small | **14.80** | 3645.0 | 33.2 | 1517 | **92.6%** |
| medium | 15.00 | 3704.6 | 33.2 | 1527 | 92.9% |
| large | 15.00 | **3726.2** | 34.5 | 1526 | 92.4% |

Definition is too broad (~92% of children). Large won 5×40. Full protocol:

| Protocol | Lines | Score | p95 |
|---|---:|---:|---:|
| 5×40 | 15.00 | 3726.2 | 33.3 |
| 5×100 | **38.20** | **14558.2** | 33.3 |
| 10×100 | **38.60** | **14633.9** | 33.1 |

10×100 surface dist: n=1.64M, mean=−0.565, median=−0.56, p95=−0.14, pos=0, neg=1.51M, active=92.2%.

**ACT: FAIL — REVERT.** Same pattern as Phase 3 absolute surface: short-game score bump, long-game collapse. “New cliff” still fires on ordinary stacking.

## 5. PASS/FAIL

| Cycle | Feature | Verdict |
|---|---|---|
| 1 | Well Delta | FAIL |
| 2 | Hole Delta | FAIL |
| 3 | Surface Damage Delta | FAIL |

p95 stayed ~33 ms (under 45) on every run. Failures are policy, not latency.

## 6. Latency impact

| Config | 10×100 p95 |
|---|---:|
| Phase 3 write-up | ~39.4 ms |
| Phase 4 freeze (height reuse, flags off) | **32.8 ms** |
| Well / hole / surface delta ON | 32.7–33.1 ms |

Parent-cached heights + reused well object kept delta cost near zero. Phase 3’s “full geometry per child” failure mode did not repeat.

## 7. Feature activation statistics

| Feature | Activations / decision | Active share of children | Selective? |
|---|---:|---:|---|
| Well delta small | 21 | 1.3% | yes |
| Well delta medium | 241 | 15% | borderline |
| Hole delta | ~1200 | 73% | **no — too broad** |
| Surface delta | ~1520 | 92% | **no — too broad** |

## 8. Delta distributions (10×100 of the sweep winner that went to full protocol)

| Feature | n | mean | median | p95 | pos | neg |
|---|---:|---:|---:|---:|---:|---:|
| Well (medium) | 1.64M | −0.0003 | 0 | 0.024 | 227k | 24k |
| Hole (small) | 1.65M | −0.225 | −0.12 | 0 | 0 | 1.21M |
| Surface (large) | 1.64M | −0.565 | −0.56 | −0.14 | 0 | 1.51M |

Median/p95 are from a deterministic subsample; mean/pos/neg are exact.

## 9. Failure cases

- **Well create overfit:** medium’s 5×40 +20 score came from rewarding well *creation*. On 100-piece games that traded singles/setup and lost 0.10 lines.
- **Tetris exception was not enough:** destroy-only (small) was 5×40-neutral and was not the sweep winner; the winner that included create failed.
- **Hole count delta ≈ extra `holes` weight:** 73% of children increase hole count vs parent, so the hinge barely filters. Score dropped with no line gain.
- **Surface “new cliff” ≈ extra bumpiness:** 92% negative. Short games look cleaner; 10×100 score collapsed ~1k points (same family of failure as Phase 3 overhang).

## 10. Adopted features

**None.** Live config remains Phase 3 / Phase 2:

```
Beam 3×12, root-complete
unconditional Hold = OFF
gated Hold = ON
well / I reservation = ON
surface / overhang = OFF
future setup / T-slot / future clear = OFF
wellDelta / holeDelta / surfaceDelta = OFF
DEFAULT_WEIGHTS unchanged
```

Height reuse inside well reservation stays (same decisions, lower p95).

## 11. Reverted features

- Well quality delta (all weights; medium went to full protocol and failed)
- Hole count delta (all weights; small went to full protocol and failed)
- Surface-damage cliff delta (all weights; large went to full protocol and failed)

Code stays behind flags for a later, narrower attempt.

## 12. Next bottleneck

Parent-relative hinges that fire on almost every child are still just reweighted leaf features. The one selective term (well destroy-only, 1.3%) was too weak to change 5×40 and was not the 5×40-best weight.

Stronger candidates:

1. **Event deltas, not count deltas:** “this placement covered the reserved well column without a tetris” as a boolean, not a quality subtraction.
2. **Root-only well-preserve:** apply destroy penalty only at ply 0 so deeper beam does not restack it.
3. Do **not** retry surface/hole count-deltas without a much tighter definition (new enclosed hole cells, not hole totals; new |Δh|≥4 away from the well, not any cliff growth).
4. Live bottleneck remains Phase 2 structure (well/I + gated Hold), not evaluation-of-change in general.
