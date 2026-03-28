# Pixel Flap — Fix & Enhance Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to implement this design.

**Goal:** Fix critical RAF loop death bug (game freezes on death, restart broken), enhance bird animation, add idle bounce, parallax clouds, and coin collectibles.

**Architecture:** All changes in `src/app/games/flappy/page.tsx`. No new files needed.

---

## Bug Fix: RAF Loop Stops on Death

**Problem:** Every death path calls `return` without first calling `requestAnimationFrame(draw)`, permanently killing the animation loop. Restart then shows a frozen canvas.

**3 locations to fix** (all in the `draw()` function):

1. **Ground/ceiling collision:**
```ts
// BEFORE:
s.status = "dead";
spawnParticles(BIRD_X, s.birdY);
audioRef.current?.playDie();
...
setUiState({ ... });
return; // ← BUG

// AFTER:
s.status = "dead";
spawnParticles(BIRD_X, s.birdY);
audioRef.current?.playDie();
...
setUiState({ ... });
rafRef.current = requestAnimationFrame(draw); // ← FIX
return;
```

2. **Pipe collision:** Same fix — add RAF before return.

**Also fix `startGame`:** Currently `stateRef.current = { ... }` works fine since the loop is always running after the fix.

---

## Visual Improvements

### Bird Animation (Wing Flap)
Add `birdWingUp: boolean` to `stateRef` (toggle every 8 frames when flying).

Draw bird with 2-frame wing animation:
```ts
// Body
ctx.fillStyle = "#ffe600";
ctx.fillRect(-10, -8, 20, 16); // main body (slightly wider)

// Wing (alternates up/down based on birdWingUp)
ctx.fillStyle = "#f5a623";
if (s.birdWingUp) {
  ctx.fillRect(-6, -14, 12, 7); // wing up
} else {
  ctx.fillRect(-6, 6, 12, 7);   // wing down
}

// Eye
ctx.fillStyle = "#000";
ctx.fillRect(4, -5, 5, 5);
ctx.fillStyle = "#fff";
ctx.fillRect(5, -4, 2, 2); // eye highlight

// Beak
ctx.fillStyle = "#f97316";
ctx.fillRect(10, -1, 7, 4);
```

Toggle `s.birdWingUp` every 8 frames when `s.status === "playing"` and `s.birdVY < 0` (going up). When falling, wing stays down.

### Idle State: Bouncing Bird
When `s.status === "idle"`, animate bird Y:
```ts
s.birdY = 200 + Math.sin(s.frame * 0.05) * 20;
s.frame++; // increment frame even in idle
```
This makes the bird bob up/down at ~0.8Hz, previewing gameplay without clicking.

### Parallax Clouds
Add `clouds` array to `stateRef`: `{ x: number; y: number; w: number }[]`

Initialize 5 clouds at random X/Y positions. Each frame (in playing mode):
- Move clouds at `PIPE_SPEED * 0.3` (30% of pipe speed)
- Wrap when `x + w < 0` → reset to `x = W + w`

Draw as white rounded rectangles:
```ts
ctx.fillStyle = "rgba(255,255,255,0.6)";
for (const cloud of s.clouds) {
  ctx.beginPath();
  ctx.roundRect(cloud.x, cloud.y, cloud.w, 18, 9);
  ctx.fill();
}
```

### Pipe Visual Polish
Add subtle gradient to pipes:
```ts
const pipeGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
pipeGrad.addColorStop(0, obstTheme.color);
pipeGrad.addColorStop(0.5, obstTheme.capColor);
pipeGrad.addColorStop(1, obstTheme.color);
ctx.fillStyle = pipeGrad;
```

---

## New Feature: Coins 🪙

### State addition
Add to `stateRef`: `coins: { x: number; y: number; collected: boolean }[]`

### Spawn logic
When a pipe is created, 50% chance to spawn a coin:
```ts
if (Math.random() < 0.5) {
  const coinY = topHeight + PIPE_GAP / 2; // center of gap
  s.coins.push({ x: W + PIPE_WIDTH / 2, y: coinY, collected: false });
}
```

### Movement
Each frame: `coin.x -= PIPE_SPEED` (same speed as pipes). Remove when `x < -20`.

### Collision
```ts
for (const coin of s.coins) {
  if (!coin.collected &&
      Math.abs(coin.x - BIRD_X) < 16 &&
      Math.abs(coin.y - s.birdY) < 16) {
    coin.collected = true;
    s.score++;
    audioRef.current?.playScore();
    setUiState((prev) => ({ ...prev, score: s.score }));
  }
}
s.coins = s.coins.filter(c => !c.collected && c.x > -20);
```

### Rendering
Draw uncollected coins as yellow circle with `🪙` emoji or:
```ts
ctx.fillStyle = "#ffe600";
ctx.shadowBlur = 8; ctx.shadowColor = "#ffe600";
ctx.beginPath();
ctx.arc(coin.x, coin.y + Math.sin(s.frame * 0.08 + coin.x) * 4, 8, 0, Math.PI * 2);
ctx.fill();
ctx.shadowBlur = 0;
```

### New Best Flash
When `s.score > previousHighScore` for the first time in a run:
```ts
// Track in stateRef: newBest: boolean
if (!s.newBest && s.score > uiState.highScore) {
  s.newBest = true;
  // Draw "NEW BEST!" text on canvas for 90 frames
  s.newBestTimer = 90;
}
if (s.newBestTimer > 0) {
  ctx.fillStyle = "#ffe600";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("NEW BEST!", W / 2, 70);
  s.newBestTimer--;
}
```

---

## Files

| File | Action |
|------|--------|
| `src/app/games/flappy/page.tsx` | All changes — RAF fix, bird animation, idle bounce, clouds, coins, new best flash |
