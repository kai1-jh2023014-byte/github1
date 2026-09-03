# Expert Replay Analysis — Phase 1

This report compares a guideline-style expert policy (and any ingested video) against the **frozen** live baseline:

```
Search = BeamSearch
Depth = 3
BeamWidth = 12
Hold search = OFF
T-spin / REN / B2B eval = ON
DEFAULT_WEIGHTS unchanged
```

Human imitation learning was **not** used. Disagreements are decision gaps, not automatic proof that the human/expert move is stronger.

## Dataset

| Item | Value |
|---|---|
| Source | guideline-expert fixture (no source mp4 in workspace; renderer ground truth, confidence=1) |
| Duration (s) | 64.00 |
| Frames | 128 |
| Valid GameStates | 64 |
| Valid Actions | 64 |
| Missing / low-confidence rate | 0.000 |
| Conf board | 1.000 |
| Conf current | 1.000 |
| Conf next | 1.000 |
| Conf hold | 1.000 |
| Conf action | 1.000 |

Source video files were not present in the workspace at analysis time. The pipeline can ingest `mp4` via ffmpeg. The numbers below come from a **labeled guideline-expert fixture** recorded through our renderer (high-confidence ground truth) plus a video round-trip check.

## Human vs AI (frozen Beam 3×12)

| Metric | Value |
|---|---|
| Compared placements | 64 |
| Top-1 agreement | 14 / 64 (21.9%) |
| Top-3 | 22 / 64 (34.4%) |
| Top-5 | 25 / 64 (39.1%) |
| Top-10 | 33 / 64 (51.6%) |
| Outside AI candidates | 13 / 64 (20.3%) |
| Hold used by expert | 13 |
| Average human rank (when in list) | 9.57 |
| Avg AI score of Beam choice | -34.027 |
| Avg AI score of expert choice | -35.058 |

Immediate 1-ply board eval (not Beam leaf score) is a different number from the search score. When they diverge, the evaluator — not only depth — is in play.

## Expert behavior vs Beam (derived, not imitation labels)

| Metric | Value |
|---|---|
| Hold use rate | 20.3% |
| Boards with a T-spin-ready slot after the expert move | 0.0% |
| B2B kept when B2B was live | 100.0% |
| REN continued when combo ≥ 1 | 36.4% |
| Disagreements labeled downstack | 0.0% |
| Disagreements labeled I-well | 16.0% |
| Disagreements labeled future setup | 22.0% |
| Disagreements where expert 1-ply eval > Beam's first-ply board | 25 (50.0%) |

## Decision Gap

Disagreements only (50 / 64).

| Category | Count | Share of disagreements |
|---|---:|---:|
| immediate_line_clear | 0 | 0.0% |
| future_setup | 11 | 22.0% |
| tspin_setup | 0 | 0.0% |
| b2b | 0 | 0.0% |
| ren | 1 | 2.0% |
| downstack | 0 | 0.0% |
| i_well | 8 | 16.0% |
| hold | 13 | 26.0% |
| board_shape | 5 | 10.0% |
| search_horizon | 0 | 0.0% |
| unknown | 12 | 24.0% |

## Important Examples

### Example 1 — hold

- Timestamp / piece index: 0
- Current: `Z`  Hold: `empty`  canHold: true
- Combo / B2B before: 0 / false
- Human: spawn=true hold=true placed=I rot=1 x=-1 y=16 hardDrop=true clears=0 tspin=none comboAfter=0 b2bAfter=false
- AI: hold=false rot=0 x=0 y=18
- Human rank in Beam list: outside
- Beam score (AI choice / human choice): -20.540 / -19.465
- Human holes/height/well-relevant maxHeight: 0 / 4 / 4
- Why they differ: Human held; frozen Beam has hold search off so it never matches this branch.
- Likely missing feature: Hold as a first-class search decision with a well/I-save prior, not an equal-weight branch.
- Classification confidence: 0.86
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
.#........
.#........
.#........
.#........
```

### Example 2 — future_setup

- Timestamp / piece index: 1
- Current: `T`  Hold: `Z`  canHold: true
- Combo / B2B before: 0 / false
- Human: spawn=true hold=false placed=T rot=0 x=2 y=18 hardDrop=true clears=0 tspin=none comboAfter=0 b2bAfter=false
- AI: hold=false rot=0 x=4 y=18
- Human rank in Beam list: 26
- Beam score (AI choice / human choice): -25.480 / -27.120
- Human holes/height/well-relevant maxHeight: 0 / 8 / 4
- Why they differ: Human rank 26 — Beam sees the move but ranks it low.
- Likely missing feature: Long-horizon setup value in the evaluator.
- Classification confidence: 0.58
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
.#........
.#........
.#.#......
.####.....
```

### Example 3 — unknown

- Timestamp / piece index: 3
- Current: `L`  Hold: `Z`  canHold: true
- Combo / B2B before: 0 / false
- Human: spawn=true hold=false placed=L rot=3 x=5 y=17 hardDrop=true clears=0 tspin=none comboAfter=0 b2bAfter=false
- AI: hold=false rot=3 x=5 y=17
- Human rank in Beam list: 8
- Beam score (AI choice / human choice): -30.430 / -30.430
- Human holes/height/well-relevant maxHeight: 0 / 16 / 4
- Why they differ: Not enough structure to label this disagreement.
- Likely missing feature: Needs manual review.
- Classification confidence: 0.35
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
.#........
.#..###...
.#.####...
.######...
```

### Example 4 — board_shape

- Timestamp / piece index: 6
- Current: `Z`  Hold: `Z`  canHold: true
- Combo / B2B before: 0 / false
- Human: spawn=true hold=false placed=Z rot=1 x=1 y=16 hardDrop=true clears=0 tspin=none comboAfter=0 b2bAfter=false
- AI: hold=false rot=1 x=6 y=15
- Human rank in Beam list: 7
- Beam score (AI choice / human choice): -34.970 / -35.268
- Human holes/height/well-relevant maxHeight: 0 / 28 / 4
- Why they differ: Human board is flatter or has fewer holes than Beam's choice.
- Likely missing feature: Surface / hole-shape features beyond current bumpiness.
- Classification confidence: 0.60
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
.#.#......
.######.##
.#########
.#########
```

### Example 5 — i_well

- Timestamp / piece index: 8
- Current: `T`  Hold: `Z`  canHold: true
- Combo / B2B before: 0 / false
- Human: spawn=true hold=false placed=T rot=2 x=1 y=14 hardDrop=true clears=0 tspin=none comboAfter=0 b2bAfter=false
- AI: hold=false rot=0 x=4 y=15
- Human rank in Beam list: 31
- Beam score (AI choice / human choice): -40.283 / -40.923
- Human holes/height/well-relevant maxHeight: 0 / 36 / 5
- Why they differ: Human kept a depth-5 well (col 0); Beam did not.
- Likely missing feature: Tetris-well / I-piece reservation feature.
- Classification confidence: 0.78
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
.###......
.###...###
.#########
.#########
.#########
```

### Example 6 — ren

- Timestamp / piece index: 34
- Current: `J`  Hold: `S`  canHold: true
- Combo / B2B before: 1 / false
- Human: spawn=true hold=false placed=J rot=3 x=7 y=17 hardDrop=true clears=1 tspin=none comboAfter=2 b2bAfter=false
- AI: hold=false rot=2 x=3 y=16
- Human rank in Beam list: 3
- Beam score (AI choice / human choice): -16.280 / -20.365
- Human holes/height/well-relevant maxHeight: 0 / 10 / 2
- Why they differ: Human continued REN (combo 1 → 2).
- Likely missing feature: Combo continuation / next-clear likelihood.
- Classification confidence: 0.68
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
..........
..........
.##.....#.
#####.#.#.
```

### Example 7 — hold

- Timestamp / piece index: 12
- Current: `J`  Hold: `Z`  canHold: true
- Combo / B2B before: 1 / false
- Human: spawn=true hold=true placed=Z rot=1 x=3 y=17 hardDrop=true clears=1 tspin=none comboAfter=2 b2bAfter=false
- AI: hold=false rot=3 x=4 y=16
- Human rank in Beam list: outside
- Beam score (AI choice / human choice): -17.683 / -18.570
- Human holes/height/well-relevant maxHeight: 0 / 12 / 2
- Why they differ: Human held; frozen Beam has hold search off so it never matches this branch.
- Likely missing feature: Hold as a first-class search decision with a well/I-save prior, not an equal-weight branch.
- Classification confidence: 0.86
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
..........
..........
.....#..##
.#########
```

### Example 8 — future_setup

- Timestamp / piece index: 2
- Current: `S`  Hold: `Z`  canHold: true
- Combo / B2B before: 0 / false
- Human: spawn=true hold=false placed=S rot=1 x=3 y=17 hardDrop=true clears=0 tspin=none comboAfter=0 b2bAfter=false
- AI: hold=false rot=1 x=3 y=17
- Human rank in Beam list: 20
- Beam score (AI choice / human choice): -28.585 / -28.585
- Human holes/height/well-relevant maxHeight: 0 / 12 / 4
- Why they differ: Human rank 20 — Beam sees the move but ranks it low.
- Likely missing feature: Long-horizon setup value in the evaluator.
- Classification confidence: 0.58
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
.#........
.#..#.....
.#.###....
.#####....
```

### Example 9 — unknown

- Timestamp / piece index: 4
- Current: `J`  Hold: `Z`  canHold: true
- Combo / B2B before: 0 / false
- Human: spawn=true hold=false placed=J rot=0 x=7 y=18 hardDrop=true clears=0 tspin=none comboAfter=0 b2bAfter=false
- AI: hold=false rot=0 x=7 y=18
- Human rank in Beam list: 4
- Beam score (AI choice / human choice): -31.715 / -31.715
- Human holes/height/well-relevant maxHeight: 0 / 20 / 4
- Why they differ: Not enough structure to label this disagreement.
- Likely missing feature: Needs manual review.
- Classification confidence: 0.35
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
.#........
.#..###...
.#.#####..
.#########
```

### Example 10 — board_shape

- Timestamp / piece index: 7
- Current: `L`  Hold: `Z`  canHold: true
- Combo / B2B before: 0 / false
- Human: spawn=true hold=false placed=L rot=2 x=7 y=15 hardDrop=true clears=0 tspin=none comboAfter=0 b2bAfter=false
- AI: hold=false rot=0 x=4 y=15
- Human rank in Beam list: 19
- Beam score (AI choice / human choice): -37.927 / -38.267
- Human holes/height/well-relevant maxHeight: 0 / 32 / 4
- Why they differ: Human board is flatter or has fewer holes than Beam's choice.
- Likely missing feature: Surface / hole-shape features beyond current bumpiness.
- Classification confidence: 0.60
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
.#.#...###
.#########
.#########
.#########
```

### Example 11 — i_well

- Timestamp / piece index: 20
- Current: `T`  Hold: `L`  canHold: true
- Combo / B2B before: 0 / false
- Human: spawn=true hold=false placed=T rot=0 x=5 y=16 hardDrop=true clears=0 tspin=none comboAfter=0 b2bAfter=false
- AI: hold=false rot=3 x=8 y=13
- Human rank in Beam list: 27
- Beam score (AI choice / human choice): -42.090 / -43.175
- Human holes/height/well-relevant maxHeight: 1 / 35 / 5
- Why they differ: Human kept a depth-4 well (col 9); Beam did not.
- Likely missing feature: Tetris-well / I-piece reservation feature.
- Classification confidence: 0.78
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
##......#.
##....#.#.
#########.
#########.
#.########
```

### Example 12 — hold

- Timestamp / piece index: 13
- Current: `I`  Hold: `J`  canHold: true
- Combo / B2B before: 2 / false
- Human: spawn=true hold=true placed=J rot=1 x=-1 y=17 hardDrop=true clears=1 tspin=none comboAfter=3 b2bAfter=false
- AI: hold=false rot=1 x=-2 y=16
- Human rank in Beam list: outside
- Beam score (AI choice / human choice): -20.437 / -17.365
- Human holes/height/well-relevant maxHeight: 1 / 7 / 2
- Why they differ: Human held; frozen Beam has hold search off so it never matches this branch.
- Likely missing feature: Hold as a first-class search decision with a well/I-save prior, not an equal-weight branch.
- Classification confidence: 0.86
- Reconstruction confidence (board/action): 1.00 / 1.00

Board after human (bottom 8 rows, `#` = filled):

```
..........
..........
..........
..........
..........
..........
##........
#....#..##
```


## Hypotheses (priority order)

Do **not** copy expert moves as labels. Each hypothesis must be A/B tested against frozen Beam 3×12.

### Hypothesis #1

```
Observed Pattern
Expert Hold appears in 13 placements; frozen Beam never holds.
        ↓
Likely Cause
Hold search is default-off because equal-weight Hold over-held and lost lines.
        ↓
Candidate Improvement
Keep Hold off as an equal candidate. Add a gated Hold: only when current is I and no tetris, or hold is I and a well is ready.
        ↓
Expected Effect
I-save without the 12-holds-per-40-piece collapse.
        ↓
How to Benchmark
A/B Hold-gated vs frozen hold-off on the same seeds; require lines not to regress.
```

### Hypothesis #2

```
Observed Pattern
Expert moves sit in Beam's list but below top-10 — the search sees them, the eval ranks them away.
        ↓
Likely Cause
Leaf eval is almost the same board heuristic as 2-ply; depth 3 cannot invent setup value that the leaf does not score.
        ↓
Candidate Improvement
Put setup features in the leaf (well, T-slot, I-hold), not more depth.
        ↓
Expected Effect
Depth 3 starts preferring the same setups the expert keeps.
        ↓
How to Benchmark
Human/expert rank of well-preserving moves should rise; frozen 3×12 A/B.
```

### Hypothesis #3

```
Observed Pattern
Expert preserves a 1-wide well in 16% of disagreements.
        ↓
Likely Cause
Current evaluator treats wells as a penalty and linesCleared as a large bonus, so Beam fills the well for a single.
        ↓
Candidate Improvement
Add a tetris-well feature (deep 1-wide column next to high walls) and a penalty for filling it with a non-I piece.
        ↓
Expected Effect
Fewer well-kills, more 4-line clears later; Hold-I becomes useful instead of harmful.
        ↓
How to Benchmark
Same 5×40 and 10×100 seeds vs frozen Beam 3×12. Watch tetrises, lines, and well-fill rate.
```

### Hypothesis #4

```
Observed Pattern
Expert surfaces are flatter / less holed than Beam's choice on disagreements.
        ↓
Likely Cause
bumpiness is adjacent-column only; overhangs and 2-wide trenches are weak.
        ↓
Candidate Improvement
Add overhang / covered-hole and 2-wide trench features.
        ↓
Expected Effect
Cleaner stacks independent of T-spin.
        ↓
How to Benchmark
holes and bumpiness after 40 pieces vs frozen.
```

### Hypothesis #5

```
Observed Pattern
Expert continues a combo when Beam drops a no-clear placement.
        ↓
Likely Cause
combo weight is small and only applied after the fact.
        ↓
Candidate Improvement
Add a next-clear-likelihood term when combo >= 1 (almost-full rows).
        ↓
Expected Effect
Short REN chains in downstack, not endless combo hunting.
        ↓
How to Benchmark
maxCombo and lines; reject if holes explode.
```

### Hypothesis #6

```
Observed Pattern
A slice of disagreements has no clean mechanic label.
        ↓
Likely Cause
Mixed motives or reconstruction noise.
        ↓
Candidate Improvement
Keep them unlabeled; do not fit weights to them.
        ↓
Expected Effect
Avoid overfitting.
        ↓
How to Benchmark
Manual review sample, not an automatic win.
```


## Notes

- Frozen Beam hold-off means every expert Hold is *outside candidates* by construction. That is a search-policy gap, not a ranking bug.
- T-spin / REN / B2B **state** exists in Core; the evaluator only rewards completed spins and current combo/B2B flags, not setups.
- Phase 1 does not change live weights or search settings.
