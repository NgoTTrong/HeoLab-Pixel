# Pac-Man Visual Upgrade - Design Doc

**Date:** 2026-03-31
**Goal:** Make Pixel Chomp more fun, replayable, and camera-friendly for YouTube content.

---

## Summary

Three targeted improvements to expose the existing Survival mode features more clearly and add visual feedback that reads well on video:

1. Survival mode as default + idle screen reframe
2. Floating score popups (ghost/fruit/combo dot)
3. Ghost evolution announcement overlay
4. Combo milestone sweep banner

---

## Section 1: Survival as Default + Idle Screen Reframe

**`config.ts`**
- Change `DEFAULT_MODIFIERS.gameMode` from `"classic"` to `"survival"`

**Idle screen:**
- SURVIVAL button: primary, full orange neon style, badge "RECOMMENDED"
- CLASSIC button: secondary, smaller, muted color
- Add 3 feature icons below buttons: FOG / GHOST AI / COMBO

**Game Over overlay:**
- Remove the two-button CLASSIC/SURVIVAL toggle
- Default restart button to current active mode (no mode switching on game over screen)

---

## Section 2: Floating Score Popups

**Triggers:**
- Dot eaten while combo >= 10: `+10 x{combo}` (small, combo color)
- Ghost eaten: `+200` / `+400` / `+800` / `+1600` (medium-large, white to yellow scale)
- Fruit eaten: `+{score} {emoji}` (large, yellow)

**Implementation:**
- `popupsRef = useRef<PopupEntry[]>([])` in page component, no Redux state
- Each entry: `{ id, text, color, x, y }`
- Spawn at Pac-Man pixel position + random +-10px horizontal offset
- Self-remove after 800ms via setTimeout
- Rendered in a `pointer-events-none` absolute overlay on top of the maze
- CSS keyframe `popupFloat`: translateY(0) opacity-1 to translateY(-40px) opacity-0 over 800ms

**Score popup color scale:**
- Combo dot: use existing `getComboColor(combo)`
- Ghost: white for 200, yellow for 400+, orange for 800+, red for 1600
- Fruit: `#ffe600`

---

## Section 3: Ghost Evolution Announcement

**Triggers:**
- Level 3: basic to aware
- Level 5: aware to evolved

**Overlay content:**

| Transition | Icon | Title | Subtitle | Color |
|-----------|------|-------|----------|-------|
| aware | brain | GHOSTS ARE LEARNING | They're starting to predict your moves | Yellow |
| evolved | skull | GHOSTS EVOLVED | They know exactly where you're going | Red + flicker |

**Behavior:**
- Detected via `useRef` tracking `prevEvolutionTier`
- `evolutionAlert` local state: `{ tier: "aware" | "evolved" } | null`
- Overlay renders with `pointer-events-none`, game does NOT pause (adds tension)
- Auto-dismiss after 2500ms
- `evolved` transition also adds `animate-[screenShake_0.5s_ease-in-out]` to maze wrapper

---

## Section 4: Combo Milestone Sweep Banner

Replaces the current `milestonePopup` float animation.

| Milestone | Style |
|-----------|-------|
| BLAZING! (x10) | Yellow banner sweeps left to right |
| UNSTOPPABLE! (x20) | Orange banner + screen edge glow pulse |
| LEGENDARY! (x100) | Red banner + `mazeFlash` keyframe (white flash) |

**Implementation:**
- Banner rendered outside the maze board div (no overflow clipping)
- CSS: translateX(-110%) to translateX(0) to translateX(110%) total 1.5s (2s for LEGENDARY)
- New keyframe `mazeFlash` in `globals.css`: white flash over 0.3s
- Apply `mazeFlash` to maze wrapper when `milestonePopup === "LEGENDARY!"`
- Keep existing `milestonePopup` / `milestonePopupTimer` logic in Redux, only change render

---

## Files to Touch

| File | Change |
|------|--------|
| `src/games/pacman/config.ts` | Default gameMode to survival |
| `src/app/games/pacman/page.tsx` | Idle screen UI, popups ref+render, evolution alert state, milestone banner render |
| `src/app/globals.css` | Add `popupFloat`, `mazeFlash` keyframes |

No changes to `logic.ts`, `types.ts`, or any other game files.
