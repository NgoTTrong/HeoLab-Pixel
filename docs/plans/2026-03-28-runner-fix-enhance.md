# Pixel Dash Fix & Enhance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix RAF loop death bug (restart broken), increase canvas to 600×380, fix layout whitespace, add slide mechanic, death animation, and score popup.

**Architecture:** All changes in `src/app/games/runner/page.tsx`. Add `altEmoji` field to `Character` interface in `config.ts` for running animation. The RAF fix keeps the loop alive on death; `startGame()` then resets state and the loop naturally resumes.

**Tech Stack:** React 18, Canvas 2D, requestAnimationFrame, TypeScript

---

### Task 1: Fix RAF loop death bug

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Locate the death path in draw()**

Find the collision detection block (around line 169–188):
```ts
for (const o of g.obstacles) {
  ...
  if (...collision...) {
    g.status = "dead";
    audioRef.current?.playDie();
    const hs = getHighScore(GAME_KEY);
    const finalScore = Math.floor(g.score);
    if (finalScore > hs) setHighScore(GAME_KEY, finalScore);
    const newChars = ...;
    if (newChars.length > 0) setNewUnlock(newChars[0].label);
    setHS(Math.max(finalScore, hs));
    setUiStatus("dead");
    return;  // ← BUG: kills RAF loop
  }
}
```

**Step 2: Fix — add RAF before return**

Replace the `return;` inside the collision block with:
```ts
    rafRef.current = requestAnimationFrame(draw);
    return;
```

**Step 3: Add dead-state rendering to draw loop**

The draw loop currently skips everything when `g.status !== "playing"`:
```ts
if (document.hidden || g.status !== "playing") {
  rafRef.current = requestAnimationFrame(draw);
  return;
}
```

Replace this guard with:
```ts
if (document.hidden) {
  rafRef.current = requestAnimationFrame(draw);
  return;
}

// When dead: keep rendering world + falling character (no game logic)
if (g.status === "dead") {
  const world = getWorld(Math.floor(g.score));
  // Sky
  ctx.fillStyle = world.skyColor;
  ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);
  // Ground
  ctx.fillStyle = world.groundColor;
  ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, H - GROUND_HEIGHT, W, 3);
  // Falling character (gravity applied)
  g.charVY = (g.charVY ?? 0) + GRAVITY;
  g.charY = Math.min(g.charY + g.charVY, H - GROUND_HEIGHT - CHAR_SIZE);
  ctx.font = `${CHAR_SIZE}px serif`;
  ctx.textBaseline = "top";
  ctx.fillText(char.emoji, CHAR_X - CHAR_SIZE / 2, g.charY);
  rafRef.current = requestAnimationFrame(draw);
  return;
}
```

**Step 4: Verify fix**

1. Open `http://localhost:3000/games/runner`
2. Select a character, click RUN
3. Hit an obstacle — character should fall, dead overlay appears
4. Click "TRY AGAIN" — game restarts immediately, character is back at ground
5. Repeat 3 times to confirm

**Step 5: Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "fix(runner): keep RAF loop alive on death so restart and death anim work"
```

---

### Task 2: Increase canvas size and fix layout whitespace

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Update W and H constants**

At the top of the file (around lines 16–18), change:
```ts
const W = 480;
const H = 300;
const CHAR_X = 80;
```

To:
```ts
const W = 600;
const H = 380;
const CHAR_X = 90;
```

**Step 2: Update canvas element**

Find:
```tsx
<canvas
  ref={canvasRef}
  width={W}
  height={H}
  className="border border-neon-green/20 rounded-sm"
  style={{ imageRendering: "pixelated", touchAction: "none", maxWidth: "100%" }}
/>
```

Replace `className` to add responsive sizing:
```tsx
<canvas
  ref={canvasRef}
  width={W}
  height={H}
  className="border border-neon-green/20 rounded-sm w-full"
  style={{ imageRendering: "pixelated", touchAction: "none", maxWidth: `${W}px` }}
/>
```

**Step 3: Fix page layout — remove min-h-screen dead space**

Find the outer container div (around line 256):
```tsx
<div className="flex flex-col items-center min-h-screen p-4 gap-4">
```

Replace with:
```tsx
<div className="flex flex-col items-center p-4 gap-3 w-full max-w-2xl mx-auto">
```

**Step 4: Fix canvas wrapper to be full width**

Find:
```tsx
<div
  className="relative cursor-pointer"
  onClick={...}
  onTouchStart={...}
>
```

Replace with:
```tsx
<div
  className="relative cursor-pointer w-full"
  onClick={...}
  onTouchStart={...}
>
```

**Step 5: Verify layout**

1. Open `http://localhost:3000/games/runner`
2. Canvas should be larger (600×380 internal resolution)
3. No massive dead space below the game
4. Page should fit neatly in viewport

**Step 6: Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "feat(runner): increase canvas to 600x380, fix layout whitespace"
```

---

### Task 3: Move score to React HUD + score popup

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Remove score/world drawing from canvas draw function**

Find this block in `draw()` (around lines 222–233):
```ts
// Score + world label
ctx.fillStyle = "rgba(0,0,0,0.5)";
ctx.font = "bold 18px monospace";
ctx.textAlign = "right";
ctx.fillText(String(Math.floor(g.score)), W - 12, 12);
ctx.textAlign = "left";
ctx.font = "10px monospace";
ctx.fillStyle = char.color;
ctx.fillText(world.label, 12, 12);
if (world.multiplier > 1) {
  ctx.fillStyle = "#ffe600";
  ctx.fillText(`×${world.multiplier.toFixed(1)}`, 12, 26);
}
```

Delete this block entirely.

**Step 2: Add score popup tracking to gameRef**

Find `gameRef` definition (around line 41). Add these fields:
```ts
scorePopTimer: 0,
scorePopY: 0,
```

**Step 3: Add score popup drawing**

Inside `draw()`, after the ground detail lines drawing and before obstacle drawing, add:
```ts
// Score milestone popup
if (g.scorePopTimer > 0) {
  ctx.globalAlpha = g.scorePopTimer / 30;
  ctx.fillStyle = "#ffe600";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ffe600";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`+${Math.floor(g.score / 100) * 100}!`, CHAR_X + 40, g.scorePopY);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  g.scorePopY -= 1.2;
  g.scorePopTimer--;
}
```

**Step 4: Trigger popup on score milestones**

Find the score milestone check (around line 164–165):
```ts
if (hundreds > g.lastHundreds) { audioRef.current?.playScore(); g.lastHundreds = hundreds; }
```

Replace with:
```ts
if (hundreds > g.lastHundreds) {
  audioRef.current?.playScore();
  g.lastHundreds = hundreds;
  g.scorePopTimer = 30;
  g.scorePopY = H - GROUND_HEIGHT - CHAR_SIZE - 20;
}
```

**Step 5: Add React HUD above canvas**

In the JSX, find the canvas wrapper div. Add a score/world HUD ABOVE the canvas wrapper:
```tsx
{/* Score HUD — shown during play */}
{(uiStatus === "playing" || uiStatus === "dead") && (
  <div className="flex justify-between w-full max-w-2xl px-1">
    <span
      className="font-pixel text-[0.5rem]"
      style={{ color: CHARACTERS[selectedChar].color }}
    >
      {/* world label shown inline */}
    </span>
    <span className="font-pixel text-[0.55rem] text-white tabular-nums">
      {uiScore}
    </span>
  </div>
)}
```

**Step 6: Verify**

1. Run the game — score appears in React HUD above canvas (not on canvas)
2. Every 100 points: `+100!` yellow text pops up briefly on canvas
3. Score readable on all world backgrounds

**Step 7: Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "feat(runner): move score to React HUD, add score milestone popup"
```

---

### Task 4: Add slide mechanic

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Add slide fields to gameRef**

In `gameRef`, add:
```ts
isSliding: false,
slideTimer: 0,
```

**Step 2: Create `slide` callback**

After the existing `jump` callback, add:
```ts
const slide = useCallback(() => {
  const g = gameRef.current;
  if (g.status !== "playing") return;
  if (!g.inAir) { // only slide on ground
    g.isSliding = true;
    g.slideTimer = 36; // ~600ms at 60fps
  }
}, []);
```

**Step 3: Add slide timer logic in draw loop**

Inside the playing draw loop, after the physics/ground check section, add:
```ts
// Slide timer countdown
if (g.isSliding) {
  g.slideTimer--;
  if (g.slideTimer <= 0) g.isSliding = false;
}
// Cancel slide if in air
if (g.inAir) g.isSliding = false;
```

**Step 4: Update collision to use reduced hitbox when sliding**

Find the collision detection block. Replace:
```ts
if (
  CHAR_X + CHAR_SIZE - 8 > o.x + 4 &&
  CHAR_X + 8 < o.x + o.width - 4 &&
  g.charY + CHAR_SIZE - 8 > oY + 4 &&
  g.charY + 8 < oY + o.height - 4
)
```

With:
```ts
const slideOffset = g.isSliding ? CHAR_SIZE * 0.55 : 0;
const charTop = g.charY + slideOffset + 8;
const charBottom = g.charY + CHAR_SIZE - 8;
if (
  CHAR_X + CHAR_SIZE - 8 > o.x + 4 &&
  CHAR_X + 8 < o.x + o.width - 4 &&
  charBottom > oY + 4 &&
  charTop < oY + o.height - 4
)
```

**Step 5: Draw character crouched when sliding**

Find the character drawing section:
```ts
// Draw character
ctx.font = `${CHAR_SIZE}px serif`;
ctx.fillText(char.emoji, CHAR_X - CHAR_SIZE / 2, g.charY);
```

Replace with:
```ts
// Draw character (crouched when sliding)
ctx.save();
if (g.isSliding) {
  const slideOffsetY = CHAR_SIZE * 0.55;
  ctx.translate(CHAR_X, g.charY + CHAR_SIZE);
  ctx.scale(1, 0.5);
  ctx.font = `${CHAR_SIZE}px serif`;
  ctx.textBaseline = "bottom";
  ctx.fillText(char.emoji, -CHAR_SIZE / 2, 0);
} else {
  ctx.font = `${CHAR_SIZE}px serif`;
  ctx.textBaseline = "top";
  ctx.fillText(char.emoji, CHAR_X - CHAR_SIZE / 2, g.charY);
}
ctx.restore();
```

**Step 6: Add keyboard handler for slide**

Find the keyboard `useEffect` (around line 242):
```ts
const handler = (e: KeyboardEvent) => {
  if ((e.code === "Space" || e.key === "ArrowUp") && uiStatus === "playing") {
    e.preventDefault();
    jump();
  }
};
```

Replace with:
```ts
const handler = (e: KeyboardEvent) => {
  if ((e.code === "Space" || e.key === "ArrowUp") && uiStatus === "playing") {
    e.preventDefault();
    jump();
  }
  if ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && uiStatus === "playing") {
    e.preventDefault();
    slide();
  }
};
```

Update `useEffect` deps: `[jump, slide, uiStatus]`.

**Step 7: Update controls hint text**

Find:
```tsx
<p className="text-[0.45rem] font-pixel text-gray-600">
  TAP / SPACE / ↑ TO JUMP · DOUBLE JUMP AVAILABLE
</p>
```

Replace with:
```tsx
<p className="text-[0.45rem] font-pixel text-gray-600">
  SPACE / ↑ JUMP · ↓ SLIDE · DOUBLE JUMP AVAILABLE
</p>
```

**Step 8: Verify**

1. Run game — press `↓` while on ground: character squishes down
2. Flying obstacles (🦅): should be passable by sliding under them
3. Ground obstacles: slide doesn't help (hitbox still overlaps)
4. Slide auto-resets after ~600ms

**Step 9: Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "feat(runner): add slide mechanic with reduced hitbox and crouch animation"
```
