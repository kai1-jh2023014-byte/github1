# External game connection (research + design)

This project does **not** copy Hoiko. It designs our own Core + Adapter loop. Facts below are limited to public writeups.

## What public sources confirm about Hoiko (PPT2 Steam)

Source: [note.com setup article (2025-12-20)](https://note.com/keen_hyena2430/n/n7bafa53a45f2)

Confirmed:

- Hoiko exposes a **PAD connection**.
- Turning it on makes Windows show an extra **Xbox 360 Controller**.
- PPT2 is expected to use it as **2P**.
- `joy.cpl` should show two Xbox-style pads after connect.
- Steam Input can merge devices so the virtual pad never reaches the game.
- Extra physical pads can occupy 1P/2P slots.

So the **input** path that is publicly documented is:

```text
Hoiko → virtual Xbox 360 pad → Windows XInput → Puyo Puyo Tetris 2 (2P)
```

## What is not confirmed (do not guess as fact)

How Hoiko obtains **board / NEXT / HOLD / garbage** is **not** specified in the public PAD setup guides we found.

Candidates, none proven for Hoiko:

| Method | Notes |
| --- | --- |
| A. Screen capture + vision | Common for bots that must not patch the game. Latency and skin/resolution sensitivity. |
| B. Official / supported game API | PPT2 does not publish a bot API that we could find. |
| C. Process memory read | Used by some **other** public projects (e.g. Zetris README describes connecting to Puyo Puyo Tetris and explicitly disables online). Accurate but version-fragile and often against ToS / anti-cheat. **Not implemented here.** |
| D. Hybrid | Vision for occupancy + another channel for queue. |

## Comparison (our evaluation)

| Metric | A Vision | B Official API | C Memory |
| --- | --- | --- | --- |
| Difficulty | Medium | N/A (no API) | High, per-build |
| Accuracy | High on our own renderer; lower on arbitrary skins | Would be best | Typically highest |
| Latency | 1 frame + detect (~0.05ms here) | — | Sub-frame possible |
| Stability | Needs calibration | — | Breaks on patches |
| Maintenance | Color / layout templates | — | Pointer maps |
| Dependencies | Screenshot | Game vendor | OS debug APIs |
| Patch resistance | Layout changes hurt | — | Almost every patch |
| Safety / ToS | Observe pixels of a local window; still respect the game's rules | — | Often disallowed; not for online |

## What we adopt

1. **AI Core is game-agnostic** (`TetrisGameState` in, `TetrisAction` out).
2. **Browser**: `BrowserGameAdapter` reads `GameEngine` state (ground truth) and presses through `GameEngine.input`. This remains the default play path so the shipped game does not change.
3. **Vision PoC**: reconstruct board + floating piece from pixels of **our** canvas. Used to prove Observe without engine internals. Measured at 1000 boards / 200 pieces.
4. **External input PoC**: map actions to XInput button names and **record** them. A Windows ViGEm backend is a stub that throws here. **Offline / own-game / local vs CPU only. No online play. No anti-cheat bypass. No PPT2 memory reader.**

## Public analogue (not Hoiko)

[Zetris](https://github.com/ZetrisAI/Zetris) publicly documents virtual-gamepad play vs Puyo Puyo Tetris and states **online is not supported**. That is the same safety boundary we keep.
