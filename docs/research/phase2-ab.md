# Phase 2 A/B — Gated Hold + Well/I Reservation

Expert-replay agreement is reported for diagnosis. **Adoption used real-game benchmarks only.**

Unconditional Hold was not enabled. Surface/overhang (D) failed and was reverted.

## Frozen baseline (A)

| Protocol | Lines | Score | GameOver | p50 ms | p95 ms | Nodes | Holds |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5×40 | 15.00 | 3704.2 | 0.000 | 30.7 | 32.2 | 1631 | 0.00 |
| 5×100 | 39.00 | 15521.4 | 0.000 | 30.8 | 32.2 | 1633 | 0.00 |
| 10×100 | 38.80 | 15616.6 | 0.000 | 30.8 | 32.2 | 1633 | 0.00 |

## Cycle 1 — Gated Hold (B)

Gate opens Hold search only for I-save / well-ready / well-preserving swaps. Empty boards do not Hold.

| Protocol | Lines | Score | GameOver | p50 ms | p95 ms | Nodes | Holds |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5×40 | 15.00 | 3704.2 | 0.000 | 30.9 | 32.1 | 1637 | 0.00 |
| 5×100 | 39.00 | 15554.2 | 0.000 | 30.8 | 32.3 | 1647 | 0.20 |
| 10×100 | 38.80 | 15633.0 | 0.000 | 30.9 | 32.4 | 1642 | 0.10 |

**PASS — KEEP.** Lines not worse. Score up on 5×100 (+32.8) and 10×100 (+16.4). GameOver unchanged. Holds ~0.1/game (not the 12/game collapse). p95 still ~32 ms.

## Cycle 2 — Well / I Reservation (C) on top of B

Leaf bonus for a 1-wide tetris well (depth 4–6 peak, not unbounded) plus I in hold/next. Partially offsets the existing wells penalty for that column only.

| Protocol | Lines | Score | GameOver | p50 ms | p95 ms | Nodes | Holds |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5×40 | 15.00 | 3704.2 | 0.000 | 35.6 | 37.1 | 1637 | 0.00 |
| 5×100 | 39.00 | 15554.2 | 0.000 | 35.6 | 37.2 | 1647 | 0.20 |
| 10×100 | 38.90 | 15722.1 | 0.000 | 35.6 | 37.3 | 1643 | 0.10 |

**PASS — KEEP.** 10×100 lines 38.80 → **38.90**, score 15616.6 → **15722.1**. GameOver still 0. p95 37 ms (under 80).

## Cycle 3 — Surface / Overhang (D) on top of C

| Protocol | Lines | Score | GameOver | p50 ms | p95 ms | Nodes | Holds |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5×40 | 15.00 | 3623.4 | 0.000 | 40.7 | 42.7 | 1638 | 0.00 |
| 5×100 | 38.80 | 15170.2 | 0.000 | 40.8 | 42.7 | 1641 | 0.20 |
| 10×100 | 38.70 | 14803.0 | 0.000 | 40.8 | 43.5 | 1644 | 0.20 |

**FAIL — REVERT.** Score and lines dropped vs frozen. Overhang weight over-penalized useful covers.

## Adopted live config

```
Beam 3×12, root-complete
unconditional Hold = OFF
gated Hold = ON
well / I reservation = ON
surface / overhang = OFF
DEFAULT_WEIGHTS unchanged
2-ply path unchanged
```

## Expert replay (diagnostic only — not the adoption target)

Same guideline-expert fixture as Phase 1 (seed 1, 64 placements).

| Metric | Frozen A | Adopted B+C |
|---|---:|---:|
| Top-1 | 14 / 64 (21.9%) | 14 / 64 (21.9%) |
| Top-3 | 22 / 64 (34.4%) | 22 / 64 (34.4%) |
| Top-5 | 25 / 64 (39.1%) | 22 / 64 (34.4%) |
| Top-10 | 33 / 64 (51.6%) | 35 / 64 (54.7%) |
| Outside candidates | 13 / 64 (20.3%) | 9 / 64 (14.1%) |
| Expert holds | 13 | 13 |
| Avg rank (in list) | 9.57 | 9.16 |

### Decision-gap counts (same fixture)

| Category | Frozen | Adopted |
|---|---:|---:|
| hold | 13 | 15 |
| future_setup | 11 | 13 |
| i_well | 8 | 3 |
| board_shape | 5 | 4 |
| ren | 1 | 1 |
| unknown | 12 | 14 |
| agree | 14 | 14 |
| immediate_line_clear | 0 | 0 |
| tspin_setup | 0 | 0 |
| b2b | 0 | 0 |
| downstack | 0 | 0 |
| search_horizon | 0 | 0 |

Hold/outside: four expert Holds entered the candidate list (20.3% → 14.1% outside). Hold-category count rose 13 → 15 because adopted search sometimes Holds when the fixture placed instead — coverage, not imitation. I-well gaps 8 → 3. Top-1 agreement stayed 21.9%. Adoption followed 10×100 lines/score, not these percentages.

## Next

- T-spin setup / B2B / downstack still lack fixture evidence — do not add yet.
- Real expert mp4 still missing; re-run replay when attached.
- Overhang needs a narrower definition before another A/B.
