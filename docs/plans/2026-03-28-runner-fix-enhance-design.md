# Pixel Dash (Runner) — Fix & Enhance Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to implement this design.

**Goal:** Fix RAF loop death bug (restart broken), increase canvas size, eliminate dead whitespace, add slide mechanic, improve character animation.

**Architecture:** Changes in `src/app/games/runner/page.tsx` and `src/games/runner/config.ts`. No new files needed.

---

## Bug Fix: RAF Loop Stops on Death

**Problem:** On collision, the draw function calls `return` without `requestAnimationFrame(draw)` → loop stops → canvas freezes → restart button has no effect.

**Fix:**
```ts
// BEFORE:
g.status = "dead";
audioRef.current?.playDie();
...
setUiStatus("dead");
return; // ← BUG

// AFTER:
g.status = "dead";
audioRef.current?.playDie();
...
setUiStatus("dead");
rafRef.current = requestAnimationFrame(draw); // ← FIX
return;
```

After fix: the loop keeps running in dead state (early return via `g.status !== "playing"` check), canvas stays live, and `startGame()` sets `g.status = "playing"` which the loop picks up naturally.

---

## Canvas & Layout

**Canvas size:** `W = 600`, `H = 380` (was 480×300)

Update constants at top of `page.tsx`:
```ts
const W = 600;
const H = 380;
```

**Page layout:** Remove `min-h-screen` from outer div, use `flex flex-col items-center p-4 gap-3` — let content determine height.

**Canvas styling:** Add `w-full max-w-2xl` to canvas wrapper for better responsiveness.

**Character select:** Cards slightly larger: `p-5`, emoji `text-5xl`.

---

## Visual Improvements

### Character Running Animation
Add `animFrame: number` to `gameRef` (increments each game frame).

Draw character with subtle "run" animation — alternate emoji every 10 frames:
```ts
// In draw():
const runFrame = Math.floor(g.frame / 10) % 2;
const charEmoji = g.inAir
  ? char.emoji          // no animation when airborne
  : (runFrame === 0 ? char.emoji : char.altEmoji ?? char.emoji);
ctx.fillText(charEmoji, CHAR_X - CHAR_SIZE / 2, g.charY);
```

Add `altEmoji?: string` to `CharacterDef` in config. For characters without `altEmoji`, just use same emoji (no animation).

### Death Animation
When `g.status === "dead"`, continue rendering but character falls with gravity:
```ts
if (g.status === "dead") {
  // Gravity still applies to character
  g.charVY += GRAVITY;
  g.charY = Math.min(g.charY + g.charVY, H - GROUND_HEIGHT - CHAR_SIZE);
  // Draw rotated character
  ctx.save();
  ctx.translate(CHAR_X, g.charY + CHAR_SIZE / 2);
  const deathAngle = Math.min(g.deathRotation ?? 0, Math.PI / 2);
  g.deathRotation = (g.deathRotation ?? 0) + 0.1;
  ctx.rotate(deathAngle);
  ctx.font = `${CHAR_SIZE}px serif`;
  ctx.fillText(char.emoji, -CHAR_SIZE / 2, -CHAR_SIZE / 2);
  ctx.restore();
}
```

Add `deathRotation: number` to `gameRef`.

### Score Display
Move score from in-canvas to React HUD above canvas:
```tsx
// Add to JSX above canvas:
{uiStatus === "playing" && (
  <div className="flex justify-between w-full max-w-2xl px-2">
    <span className="font-pixel text-[0.5rem]" style={{ color: char.color }}>
      {world.label}
    </span>
    <span className="font-pixel text-[0.5rem] text-white">{uiScore}</span>
  </div>
)}
```

Remove score drawing from canvas draw function.

---

## New Feature: Slide Mechanic

### State addition
Add to `gameRef`:
```ts
isSliding: boolean;
slideTimer: number; // frames remaining
```

### Trigger
- `↓` key or swipe down → `g.isSliding = true`, `g.slideTimer = 36` (600ms at 60fps)
- Only when on ground (`!g.inAir`)

### Effect during slide
- Character height reduced: use `CHAR_SIZE * 0.5` for collision box Y
- Draw character crouched: scale Y by 0.5 with `ctx.scale(1, 0.5)` and shift down

### Collision adjustment
When `g.isSliding`, use reduced hitbox:
```ts
const effectiveCharH = g.isSliding ? CHAR_SIZE * 0.5 : CHAR_SIZE;
const effectiveCharY = g.isSliding ? g.charY + CHAR_SIZE * 0.5 : g.charY;
```

### Keyboard handler addition
```ts
if ((e.code === "ArrowDown" || e.key === "s") && uiStatus === "playing") {
  e.preventDefault();
  slide();
}
```

### Score popup
Every 100 points, show `+100!` floating text on canvas for 30 frames:
```ts
// Track in gameRef: scorePopTimer, scorePopY
if (hundreds > g.lastHundreds) {
  g.scorePopTimer = 30;
  g.scorePopY = H - GROUND_HEIGHT - 60;
}
if (g.scorePopTimer > 0) {
  ctx.globalAlpha = g.scorePopTimer / 30;
  ctx.fillStyle = "#ffe600";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`+${hundreds * 100}`, CHAR_X + 40, g.scorePopY);
  ctx.globalAlpha = 1;
  g.scorePopY -= 1.5;
  g.scorePopTimer--;
}
```

---

## Controls Update

Update hint text:
```tsx
<p className="text-[0.45rem] font-pixel text-gray-600">
  TAP / SPACE / ↑ TO JUMP · ↓ TO SLIDE · DOUBLE JUMP AVAILABLE
</p>
```

---

## Files

| File | Action |
|------|--------|
| `src/app/games/runner/page.tsx` | RAF fix, canvas size, layout, animation, slide mechanic, score popup, death anim |
| `src/games/runner/config.ts` | Add `altEmoji` to CharacterDef (if it exists), check CHAR_X constant |
