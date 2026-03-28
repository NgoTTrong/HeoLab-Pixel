# Pixel Flap Fix & Enhance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical RAF loop death bug (restart broken), add idle bird bounce, wing animation, parallax clouds, and coin collectibles.

**Architecture:** All changes in `src/app/games/flappy/page.tsx`. The core fix is adding `rafRef.current = requestAnimationFrame(draw)` before each `return` on death so the loop never stops. Enhancements extend `stateRef` with new fields (clouds, coins, birdWingUp, newBestTimer).

**Tech Stack:** React 18, Canvas 2D, requestAnimationFrame, TypeScript

---

### Task 1: Fix RAF loop death bug

**Files:**
- Modify: `src/app/games/flappy/page.tsx`

**Step 1: Understand the bug**

In `page.tsx`, the `draw()` function has 2 death paths that call `return` without first calling `requestAnimationFrame(draw)`. This permanently kills the animation loop. After death, the canvas freezes and clicking "TRY AGAIN" has no visual effect.

**Step 2: Fix ground/ceiling collision** (around line 172–180)

Find:
```ts
if (s.birdY + BIRD_SIZE / 2 > H - GROUND_HEIGHT || s.birdY - BIRD_SIZE / 2 < 0) {
  s.status = "dead";
  spawnParticles(BIRD_X, s.birdY);
  audioRef.current?.playDie();
  const hs = getHighScore(GAME_KEY);
  if (s.score > hs) setHighScore(GAME_KEY, s.score);
  setUiState({ status: "dead", score: s.score, highScore: Math.max(s.score, hs) });
  return;
}
```

Replace `return;` with:
```ts
  rafRef.current = requestAnimationFrame(draw);
  return;
```

**Step 3: Fix pipe collision** (around line 192–201)

Find the second death block inside the pipe collision loop:
```ts
s.status = "dead";
spawnParticles(BIRD_X, s.birdY);
audioRef.current?.playDie();
const hs = getHighScore(GAME_KEY);
if (s.score > hs) setHighScore(GAME_KEY, s.score);
setUiState({ status: "dead", score: s.score, highScore: Math.max(s.score, hs) });
return;
```

Same fix — replace `return;` with:
```ts
rafRef.current = requestAnimationFrame(draw);
return;
```

**Step 4: Verify fix**

1. Open `http://localhost:3000/games/flappy`
2. Click to start, fly into a pipe
3. Click "TRY AGAIN" — game should restart and bird should appear
4. Repeat 3 times to confirm restart always works

**Step 5: Commit**

```bash
git add src/app/games/flappy/page.tsx
git commit -m "fix(flappy): keep RAF loop alive on death so restart works"
```

---

### Task 2: Add idle bird bounce + extend stateRef

**Files:**
- Modify: `src/app/games/flappy/page.tsx`

**Step 1: Update stateRef type and initial value**

Find `stateRef` definition (around line 35). Replace with:
```ts
const stateRef = useRef({
  status: "idle" as GameStatus,
  birdY: 200,
  birdVY: 0,
  pipes: [] as Pipe[],
  coins: [] as { x: number; y: number; collected: boolean }[],
  clouds: [] as { x: number; y: number; w: number }[],
  particles: [] as Particle[],
  score: 0,
  frame: 0,
  birdAngle: 0,
  birdWingUp: false,
  newBestTimer: 0,
  newBestShown: false,
});
```

**Step 2: Initialize clouds in stateRef**

Add a `useEffect` after the audio lazy-init effects to populate initial clouds:
```ts
useEffect(() => {
  // Pre-populate clouds for idle state
  stateRef.current.clouds = Array.from({ length: 5 }, (_, i) => ({
    x: i * 100 + Math.random() * 60,
    y: 40 + Math.random() * 80,
    w: 60 + Math.random() * 60,
  }));
}, []);
```

**Step 3: Update `startGame` to reset new fields**

Find `startGame` function (around line 92). Replace with:
```ts
const startGame = useCallback(() => {
  theme.current = getTimeTheme();
  stateRef.current = {
    status: "playing",
    birdY: 200,
    birdVY: 0,
    pipes: [],
    coins: [],
    clouds: Array.from({ length: 5 }, (_, i) => ({
      x: i * 100 + 50,
      y: 40 + Math.random() * 80,
      w: 60 + Math.random() * 60,
    })),
    particles: [],
    score: 0,
    frame: 0,
    birdAngle: 0,
    birdWingUp: false,
    newBestTimer: 0,
    newBestShown: false,
  };
  setUiState((s) => ({ ...s, status: "playing", score: 0 }));
}, []);
```

**Step 4: Add idle bird bounce in draw loop**

In the `draw()` function, find the `if (s.status === "playing")` block. BEFORE it (around line 144), add:
```ts
// Idle animation: bird bobs up/down
if (s.status === "idle") {
  s.frame++;
  s.birdY = 200 + Math.sin(s.frame * 0.05) * 20;
}
```

**Step 5: Commit**

```bash
git add src/app/games/flappy/page.tsx
git commit -m "feat(flappy): add idle bird bounce animation and extend stateRef for enhancements"
```

---

### Task 3: Add bird wing animation + parallax clouds

**Files:**
- Modify: `src/app/games/flappy/page.tsx`

**Step 1: Add cloud movement in game loop**

Inside `if (s.status === "playing")` block, after the pipes movement section, add:
```ts
// Move clouds (parallax — slower than pipes)
for (const cloud of s.clouds) {
  cloud.x -= PIPE_SPEED * 0.3;
  if (cloud.x + cloud.w < 0) {
    cloud.x = W + cloud.w;
    cloud.y = 40 + Math.random() * 80;
  }
}

// Toggle wing animation every 8 frames
if (s.frame % 8 === 0) s.birdWingUp = !s.birdWingUp;
```

**Step 2: Draw clouds AFTER sky gradient, BEFORE pipes**

Find where sky gradient is drawn (around line 132–136). After the sky gradient fillRect and ground drawing, add cloud rendering:
```ts
// Draw clouds (parallax background)
ctx.shadowBlur = 0;
for (const cloud of s.clouds) {
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  // Simple cloud: overlapping circles
  ctx.arc(cloud.x + cloud.w * 0.3, cloud.y + 9, 12, 0, Math.PI * 2);
  ctx.arc(cloud.x + cloud.w * 0.6, cloud.y + 5, 16, 0, Math.PI * 2);
  ctx.arc(cloud.x + cloud.w * 0.8, cloud.y + 11, 10, 0, Math.PI * 2);
  ctx.fill();
}
```

**Step 3: Replace bird drawing with animated version**

Find the bird drawing section (around line 217–228):
```ts
// Draw bird (pixel square with rotation)
ctx.save();
ctx.translate(BIRD_X, s.birdY);
ctx.rotate((s.birdAngle * Math.PI) / 180);
if (s.status !== "dead") {
  ctx.fillStyle = "#ffe600";
  ctx.fillRect(-BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
  ctx.fillStyle = "#ff2d95";
  ctx.fillRect(4, -4, 8, 8);
  ctx.fillStyle = "#f97316";
  ctx.fillRect(BIRD_SIZE / 2 - 2, 0, 8, 4);
}
ctx.restore();
```

Replace with:
```ts
// Draw bird with wing animation
ctx.save();
ctx.translate(BIRD_X, s.birdY);
ctx.rotate((s.birdAngle * Math.PI) / 180);
if (s.status !== "dead") {
  // Wing (behind body)
  ctx.fillStyle = "#f5a623";
  if (s.birdWingUp && s.status === "playing") {
    ctx.fillRect(-5, -16, 10, 8);  // wing up
  } else {
    ctx.fillRect(-5, 6, 10, 8);    // wing down / idle
  }
  // Body
  ctx.fillStyle = "#ffe600";
  ctx.fillRect(-10, -9, 20, 18);
  // Eye
  ctx.fillStyle = "#000";
  ctx.fillRect(3, -5, 5, 5);
  ctx.fillStyle = "#fff";
  ctx.fillRect(4, -4, 2, 2);
  // Beak
  ctx.fillStyle = "#f97316";
  ctx.fillRect(10, -1, 7, 4);
  // Glow
  ctx.shadowBlur = 6;
  ctx.shadowColor = "#ffe600";
  ctx.fillStyle = "#ffe600";
  ctx.fillRect(-10, -9, 20, 18);
  ctx.shadowBlur = 0;
}
ctx.restore();
```

**Step 4: Verify in browser**

1. Open `http://localhost:3000/games/flappy`
2. On idle screen: bird should be bobbing up/down, clouds drifting behind it
3. Click to start: wings should flap during gameplay
4. Clouds move slower than pipes (parallax effect)

**Step 5: Commit**

```bash
git add src/app/games/flappy/page.tsx
git commit -m "feat(flappy): add wing animation, parallax clouds"
```

---

### Task 4: Add coin collectibles + new best flash

**Files:**
- Modify: `src/app/games/flappy/page.tsx`

**Step 1: Spawn coins when pipes are created**

Find the pipe spawn section inside `if (s.status === "playing")` (around line 151–156):
```ts
if (s.frame % PIPE_INTERVAL === 0) {
  const minTop = 60;
  const maxTop = H - GROUND_HEIGHT - PIPE_GAP - 60;
  const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
  s.pipes.push({ x: W, topHeight, passed: false });
}
```

Replace with:
```ts
if (s.frame % PIPE_INTERVAL === 0) {
  const minTop = 60;
  const maxTop = H - GROUND_HEIGHT - PIPE_GAP - 60;
  const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
  s.pipes.push({ x: W, topHeight, passed: false });
  // 50% chance to spawn a coin in the center of the gap
  if (Math.random() < 0.5) {
    const coinY = topHeight + PIPE_GAP / 2;
    s.coins.push({ x: W + PIPE_WIDTH / 2, y: coinY, collected: false });
  }
}
```

**Step 2: Move coins and check collision + new best**

Inside `if (s.status === "playing")`, after the pipe movement + scoring section, add:
```ts
// Move coins
s.coins = s.coins.filter((c) => c.x > -20);
for (const coin of s.coins) {
  coin.x -= PIPE_SPEED;
}

// Coin collection
for (const coin of s.coins) {
  if (
    !coin.collected &&
    Math.abs(coin.x - BIRD_X) < 16 &&
    Math.abs(coin.y - s.birdY) < 16
  ) {
    coin.collected = true;
    s.score++;
    audioRef.current?.playScore();
    setUiState((prev) => ({ ...prev, score: s.score }));
  }
}
s.coins = s.coins.filter((c) => !c.collected);

// New best detection
const currentBest = uiState.highScore;
if (!s.newBestShown && s.score > currentBest && currentBest > 0) {
  s.newBestShown = true;
  s.newBestTimer = 90;
}
if (s.newBestTimer > 0) s.newBestTimer--;
```

**Step 3: Draw coins and new best text**

After drawing pipes but before drawing the bird, add:
```ts
// Draw coins
for (const coin of s.coins) {
  const bobY = coin.y + Math.sin(s.frame * 0.1 + coin.x * 0.01) * 4;
  ctx.fillStyle = "#ffe600";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ffe600";
  ctx.beginPath();
  ctx.arc(coin.x, bobY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b8860b";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.fillText("$", coin.x, bobY + 3);
  ctx.shadowBlur = 0;
}
ctx.textAlign = "left";

// New best flash
if (s.newBestTimer > 0) {
  const alpha = Math.min(1, s.newBestTimer / 30);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffe600";
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#ffe600";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText("★ NEW BEST!", W / 2, 72);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}
```

**Step 4: Verify in browser**

1. Play a game — yellow coin circles should appear in pipe gaps
2. Fly through coins — score increases, coins disappear
3. Beat your high score → "★ NEW BEST!" flashes at top of canvas

**Step 5: Commit**

```bash
git add src/app/games/flappy/page.tsx
git commit -m "feat(flappy): add coin collectibles and new-best flash"
```
