# Tetris Zen Flow System — Design

**Date:** 2026-04-04

## Overview

Add an escalating "Flow" reward system to Tetris Zen mode. The combo counter (already tracked) drives visual escalation and score multipliers, giving players a satisfying progression loop without adding chaos or punishment.

## Flow Tiers

| Combo | Tier | Banner | Line Score Mult | Visual |
|-------|------|--------|----------------|--------|
| 0–2 | — | — | 1× | normal |
| 3–5 | FLOW | "✨ FLOW!" | 1.5× | board soft green glow |
| 6–9 | DEEP FLOW | "🌊 DEEP FLOW!" | 2× | rainbow aurora border, purple/pink |
| 10+ | TRANSCENDENCE | "🌟 TRANSCENDENCE!" | 3× | full board white pulse, massive particles |

## UI Components

- **Flow Bar** — vertical bar on the left panel (below HOLD), fills proportionally toward next tier threshold, color matches current tier
- **Tier Banner** — large popup (bigger than score popup) shown once when entering a new tier
- **Board overlay** — subtle colored glow/gradient matching tier, intensity proportional to combo within tier

## Mechanics

- Multiplier applies to `lineScore` only (not combo bonus) to keep balance
- Break combo → Flow resets to 0, board overlay fades out over 0.5s
- Flow system only active in Zen mode

## Files Changed

1. `src/games/tetris/config.ts` — add `ZEN_FLOW_TIERS` constant array
2. `src/games/tetris/logic.ts` — apply flow multiplier to `lineScore` when `mode === "zen"`
3. `src/app/games/tetris/page.tsx` — Flow Bar, tier banner popup, board overlay per tier
