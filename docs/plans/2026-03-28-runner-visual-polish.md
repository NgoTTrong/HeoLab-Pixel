# Runner Visual Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebalance start speed, add emoji drop-shadows for contrast, gradient sky, smooth world color transitions, parallax clouds, night stars, and richer ground detail.

**Architecture:** All rendering lives in the `draw()` RAF loop inside `src/app/games/runner/page.tsx`. Config data (colors, speeds) lives in `src/games/runner/config.ts`. We add two new fields to the `World` interface (`skyColorBottom`, `groundStripeColor`), two new module-level interfaces (`CloudObj`, `StarObj`), and new fields on `gameRef` for transition state, clouds, and stars. No new files needed.

**Tech Stack:** React 18, Canvas 2D, requestAnimationFrame, TypeScript

---

### Task 1: Config additions — speed, sky gradient, ground stripe colors

**Files:**
- Modify: `src/games/runner/config.ts`

**Step 1: Update `World` interface — add two new color fields**

Find:
```ts
export interface World {
  minScore: number;
  id: string;
  label: string;
  skyColor: string;
  groundColor: string;
  multiplier: number;
}
```

Replace with:
```ts
export interface World {
  minScore: number;
  id: string;
  label: string;
  skyColor: string;
  skyColorBottom: string;
  groundColor: string;
  groundStripeColor: string;
  multiplier: number;
}
```

**Step 2: Update WORLDS data with new color values**

Replace the entire `WORLDS` array:
```ts
export const WORLDS: World[] = [
  {
    minScore: 0,    id: "desert", label: "DESERT",
    skyColor: "#87CEEB",  skyColorBottom: "#c8eaf9",
    groundColor: "#c2965a", groundStripeColor: "#d4a96a",
    multiplier: 1.0,
  },
  {
    minScore: 300,  id: "dusk",   label: "DUSK",
    skyColor: "#c0392b",  skyColorBottom: "#f39c12",
    groundColor: "#6d4c41", groundStripeColor: "#8d6e63",
    multiplier: 1.2,
  },
  {
    minScore: 600,  id: "storm",  label: "NIGHT STORM",
    skyColor: "#0d0d1a",  skyColorBottom: "#1a1a2e",
    groundColor: "#2a2a4a", groundStripeColor: "#3a3a5a",
    multiplier: 1.5,
  },
  {
    minScore: 1000, id: "lava",   label: "LAVA WORLD",
    skyColor: "#1a0500",  skyColorBottom: "#3d0a00",
    groundColor: "#7f1d1d", groundStripeColor: "#991f1f",
    multiplier: 2.0,
  },
];
```

**Step 3: Lower BASE_SPEED**

Find:
```ts
export const BASE_SPEED = 5;
```

Replace with:
```ts
export const BASE_SPEED = 3;
```

**Step 4: TypeScript check**

```bash
cd E:\Personal\GameStation && npx tsc --noEmit
```

Expected: no errors. If errors mention `skyColorBottom` / `groundStripeColor` missing in page.tsx — that's fine, they'll be added in Task 2+.

**Step 5: Commit**

```bash
git add src/games/runner/config.ts
git commit -m "feat(runner): add skyColorBottom, groundStripeColor to World; lower BASE_SPEED 5→3"
```

---

### Task 2: Gradient sky + emoji shadows + speed formula fix

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Fix speed formula**

Find (inside `draw()`, the playing branch):
```ts
g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.score / 300);
```

Replace with:
```ts
g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.score / 600);
```

**Step 2: Replace flat sky fill with gradient**

Find:
```ts
      // Draw sky
      ctx.fillStyle = world.skyColor;
      ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);
```

Replace with:
```ts
      // Draw sky (gradient)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
      skyGrad.addColorStop(0, world.skyColor);
      skyGrad.addColorStop(1, world.skyColorBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);
```

**Step 3: Add emoji shadows to obstacle drawing**

Find:
```ts
      // Draw obstacles
      ctx.textBaseline = "top";
      for (const o of g.obstacles) {
        ctx.font = `${o.height}px serif`;
        ctx.fillText(o.emoji, o.x, o.flyY);
      }
```

Replace with:
```ts
      // Draw obstacles
      ctx.textBaseline = "top";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      for (const o of g.obstacles) {
        ctx.font = `${o.height}px serif`;
        ctx.fillText(o.emoji, o.x, o.flyY);
      }
      ctx.shadowBlur = 0;
```

**Step 4: Add emoji shadow to character drawing**

Find (in the playing branch):
```ts
      // Draw character (crouched when sliding)
      ctx.save();
      if (g.isSliding) {
```

Replace with:
```ts
      // Draw character (crouched when sliding)
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      if (g.isSliding) {
```

The `ctx.restore()` already clears the shadow state — no extra reset needed.

**Step 5: Add emoji shadow to dead-state character rendering**

Find (in the dead-state block):
```ts
        ctx.font = `${CHAR_SIZE}px serif`;
        ctx.textBaseline = "top";
        ctx.fillText(char.emoji, CHAR_X - CHAR_SIZE / 2, g.charY);
        rafRef.current = requestAnimationFrame(draw);
```

Replace with:
```ts
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.font = `${CHAR_SIZE}px serif`;
        ctx.textBaseline = "top";
        ctx.fillText(char.emoji, CHAR_X - CHAR_SIZE / 2, g.charY);
        ctx.shadowBlur = 0;
        rafRef.current = requestAnimationFrame(draw);
```

**Step 6: Also apply gradient sky to dead-state block**

Find (in the dead-state block):
```ts
        // Sky
        ctx.fillStyle = world.skyColor;
        ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);
```

Replace with:
```ts
        // Sky (gradient)
        const deadSkyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
        deadSkyGrad.addColorStop(0, world.skyColor);
        deadSkyGrad.addColorStop(1, world.skyColorBottom);
        ctx.fillStyle = deadSkyGrad;
        ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);
```

**Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 8: Browser verify**

1. Open `http://localhost:3000/games/runner`
2. Start game — sky should be a gradient (light blue fading lighter at horizon)
3. Character and cactus should have dark drop-shadows, clearly visible
4. Initial speed should feel noticeably slower

**Step 9: Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "feat(runner): gradient sky, emoji drop-shadows, speed formula score/600"
```

---

### Task 3: Smooth world color transitions (lerpColor)

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Add `lerpColor` helper — place it just before the component function**

Find:
```ts
export default function RunnerPage() {
```

Insert above it:
```ts
function lerpColor(a: string, b: string, t: number): string {
  const ah = a.replace("#", "");
  const bh = b.replace("#", "");
  const ar = parseInt(ah.slice(0, 2), 16);
  const ag = parseInt(ah.slice(2, 4), 16);
  const ab2 = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16);
  const bg = parseInt(bh.slice(2, 4), 16);
  const bb2 = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
  const g2 = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
  const b3 = Math.round(ab2 + (bb2 - ab2) * t).toString(16).padStart(2, "0");
  return `#${r}${g2}${b3}`;
}

```

**Step 2: Add transition fields to `gameRef`**

Find:
```ts
    isSliding: false,
    slideTimer: 0,
  });
```

Replace with:
```ts
    isSliding: false,
    slideTimer: 0,
    fromSkyTop: "#87CEEB",
    fromSkyBot: "#c8eaf9",
    fromGround: "#c2965a",
    toSkyTop: "#87CEEB",
    toSkyBot: "#c8eaf9",
    toGround: "#c2965a",
    transitionT: 1,
    lastWorldId: "desert",
  });
```

**Step 3: Reset transition fields in `startGame`**

Find:
```ts
    g.isSliding = false;
    g.slideTimer = 0;
    setUiStatus("playing");
```

Replace with:
```ts
    g.isSliding = false;
    g.slideTimer = 0;
    const startWorld = getWorld(0);
    g.fromSkyTop = startWorld.skyColor;
    g.fromSkyBot = startWorld.skyColorBottom;
    g.fromGround = startWorld.groundColor;
    g.toSkyTop = startWorld.skyColor;
    g.toSkyBot = startWorld.skyColorBottom;
    g.toGround = startWorld.groundColor;
    g.transitionT = 1;
    g.lastWorldId = startWorld.id;
    setUiStatus("playing");
```

**Step 4: Detect world change and start transition, then compute effective colors**

Inside `draw()` playing branch, find:
```ts
      g.frame++;
      const world = getWorld(Math.floor(g.score));
      g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.score / 600);
      g.groundOffset = (g.groundOffset + g.speed) % 40;
```

Replace with:
```ts
      g.frame++;
      const world = getWorld(Math.floor(g.score));
      g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.score / 600);
      g.groundOffset = (g.groundOffset + g.speed) % 40;

      // World transition detection
      if (world.id !== g.lastWorldId) {
        g.fromSkyTop = lerpColor(g.fromSkyTop, g.toSkyTop, g.transitionT);
        g.fromSkyBot = lerpColor(g.fromSkyBot, g.toSkyBot, g.transitionT);
        g.fromGround = lerpColor(g.fromGround, g.toGround, g.transitionT);
        g.toSkyTop = world.skyColor;
        g.toSkyBot = world.skyColorBottom;
        g.toGround = world.groundColor;
        g.transitionT = 0;
        g.lastWorldId = world.id;
      }
      if (g.transitionT < 1) g.transitionT = Math.min(1, g.transitionT + 1 / 120);

      const effSkyTop = lerpColor(g.fromSkyTop, g.toSkyTop, g.transitionT);
      const effSkyBot = lerpColor(g.fromSkyBot, g.toSkyBot, g.transitionT);
      const effGround = lerpColor(g.fromGround, g.toGround, g.transitionT);
```

**Step 5: Use effective colors instead of raw world colors for sky and ground**

Replace the gradient sky block:
```ts
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
      skyGrad.addColorStop(0, world.skyColor);
      skyGrad.addColorStop(1, world.skyColorBottom);
```

With:
```ts
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
      skyGrad.addColorStop(0, effSkyTop);
      skyGrad.addColorStop(1, effSkyBot);
```

Replace the ground fill:
```ts
      ctx.fillStyle = world.groundColor;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
```

With:
```ts
      ctx.fillStyle = effGround;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
```

**Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 7: Browser verify**

Play past score 300 — sky should smoothly shift from light blue → sunset red/orange over ~2 seconds instead of snapping.

**Step 8: Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "feat(runner): smooth world color transitions via lerpColor over 120 frames"
```

---

### Task 4: Parallax clouds

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Add `CloudObj` interface — place it next to `ObstacleObj`**

Find:
```ts
interface ObstacleObj {
```

Insert above it:
```ts
interface CloudObj {
  x: number;
  y: number;
  r: number;
  speed: number;
}

interface StarObj {
  x: number;
  y: number;
  phase: number;
}

```

**Step 2: Add clouds and stars arrays to `gameRef`**

Find:
```ts
    fromSkyTop: "#87CEEB",
```

Insert above it:
```ts
    clouds: [] as CloudObj[],
    stars: [] as StarObj[],
```

**Step 3: Initialize clouds and stars once in the RAF `useEffect`**

The RAF effect starts with:
```ts
    function draw() {
```

Insert between the `const char = ...` line and `function draw()`:
```ts
    // Init clouds once
    if (gameRef.current.clouds.length === 0) {
      gameRef.current.clouds = Array.from({ length: 4 }, (_, i) => ({
        x: (W / 4) * i + Math.random() * 80,
        y: 20 + Math.random() * 80,
        r: 22 + Math.random() * 22,
        speed: 0.22 + Math.random() * 0.13,
      }));
    }
    // Init stars once
    if (gameRef.current.stars.length === 0) {
      gameRef.current.stars = Array.from({ length: 40 }, () => ({
        x: Math.random() * W,
        y: Math.random() * (H - GROUND_HEIGHT) * 0.7,
        phase: Math.random() * Math.PI * 2,
      }));
    }
```

**Step 4: Draw clouds — insert after the sky gradient block, before ground drawing**

Find:
```ts
      // Draw ground
      ctx.fillStyle = effGround;
```

Insert above it:
```ts
      // Parallax clouds
      const cloudAlpha = world.id === "storm" || world.id === "lava"
        ? 0.1 * (1 - g.transitionT) + (world.id === "storm" || world.id === "lava" ? 0.1 : 0.55) * g.transitionT
        : 0.55;
      if (cloudAlpha > 0.01) {
        ctx.save();
        for (const cloud of g.clouds) {
          cloud.x -= g.speed * cloud.speed;
          if (cloud.x + cloud.r * 2.5 < 0) cloud.x = W + cloud.r;
          ctx.globalAlpha = cloudAlpha;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
          ctx.arc(cloud.x + cloud.r * 0.9, cloud.y - cloud.r * 0.35, cloud.r * 0.7, 0, Math.PI * 2);
          ctx.arc(cloud.x + cloud.r * 1.7, cloud.y, cloud.r * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

```

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Browser verify**

Clouds should drift slowly left across the sky. In night storm world they should be nearly invisible.

**Step 7: Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "feat(runner): parallax clouds with alpha fade in night/lava worlds"
```

---

### Task 5: Stars + ground upgrade

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Draw stars — insert after the clouds block, before ground drawing**

Find:
```ts
      // Draw ground
      ctx.fillStyle = effGround;
```

Insert above it:
```ts
      // Stars (night/lava worlds)
      const isNight = world.id === "storm" || world.id === "lava";
      const starAlpha = isNight ? g.transitionT : (1 - g.transitionT) * (g.lastWorldId === "storm" || g.lastWorldId === "lava" ? 1 : 0);
      if (starAlpha > 0.01) {
        ctx.save();
        for (const star of g.stars) {
          const twinkle = 0.4 + 0.4 * Math.sin(g.frame * 0.05 + star.phase);
          ctx.globalAlpha = starAlpha * twinkle;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(star.x, star.y, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

```

**Step 2: Upgrade ground rendering — add top stripe and lava cracks**

Find:
```ts
      // Draw ground
      ctx.fillStyle = effGround;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, H - GROUND_HEIGHT, W, 3);
```

Replace with:
```ts
      // Draw ground
      ctx.fillStyle = effGround;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);

      // Ground top stripe (lighter accent band)
      const effStripe = lerpColor(
        getWorld(g.lastWorldId === world.id ? Math.floor(g.score) : 0).groundStripeColor,
        world.groundStripeColor,
        g.transitionT
      );
      ctx.fillStyle = effStripe;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, 6);

      // Shadow line
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, H - GROUND_HEIGHT, W, 3);

      // Lava cracks
      if (world.id === "lava" && g.transitionT > 0.3) {
        ctx.save();
        ctx.globalAlpha = (g.transitionT - 0.3) / 0.7;
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 1.5;
        for (let cx = (g.groundOffset * 2) % 80; cx < W; cx += 80) {
          ctx.beginPath();
          ctx.moveTo(cx, H - GROUND_HEIGHT + 8);
          ctx.lineTo(cx + 12, H - GROUND_HEIGHT + 22);
          ctx.lineTo(cx + 6, H - GROUND_HEIGHT + 38);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
```

**Step 3: Fix the `effStripe` computation** — the approach above is slightly wrong since we don't have easy access to fromWorld's stripe. Simplify: just lerp between the fixed world stripe colors directly:

Replace the `effStripe` line with:
```ts
      const fromWorldDef = WORLDS.find(w => w.id === g.lastWorldId) ?? WORLDS[0];
      const effStripe = lerpColor(fromWorldDef.groundStripeColor, world.groundStripeColor, g.transitionT);
```

And remove the `getWorld(...)` call you added in Step 2. The full updated block should look like:

```ts
      // Draw ground
      ctx.fillStyle = effGround;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);

      // Ground top stripe
      const fromWorldDef = WORLDS.find(w => w.id === g.lastWorldId) ?? WORLDS[0];
      const effStripe = lerpColor(fromWorldDef.groundStripeColor, world.groundStripeColor, g.transitionT);
      ctx.fillStyle = effStripe;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, 6);

      // Shadow line
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, H - GROUND_HEIGHT, W, 3);

      // Lava cracks
      if (world.id === "lava" && g.transitionT > 0.3) {
        ctx.save();
        ctx.globalAlpha = (g.transitionT - 0.3) / 0.7;
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 1.5;
        for (let cx = (g.groundOffset * 2) % 80; cx < W; cx += 80) {
          ctx.beginPath();
          ctx.moveTo(cx, H - GROUND_HEIGHT + 8);
          ctx.lineTo(cx + 12, H - GROUND_HEIGHT + 22);
          ctx.lineTo(cx + 6, H - GROUND_HEIGHT + 38);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
```

**Step 4: Import WORLDS in the component file**

`WORLDS` is already exported from config.ts. Add it to the import:

Find:
```ts
import {
  CHARACTERS, GROUND_HEIGHT, GRAVITY, JUMP_IMPULSE, BASE_SPEED, MAX_SPEED,
  getWorld, getAvailableObstacles,
} from "@/games/runner/config";
```

Replace with:
```ts
import {
  CHARACTERS, WORLDS, GROUND_HEIGHT, GRAVITY, JUMP_IMPULSE, BASE_SPEED, MAX_SPEED,
  getWorld, getAvailableObstacles,
} from "@/games/runner/config";
```

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 6: Browser verify**

1. Desert world — sandy top stripe on ground, soft clouds drifting
2. Score 600+ (Night Storm) — clouds fade, stars twinkle in dark sky
3. Score 1000+ (Lava) — orange crack lines animate on ground

**Step 7: Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "feat(runner): stars for night/lava worlds, ground stripe + lava crack detail"
```

---

### Task 6: Cloud alpha fix + final cleanup

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Fix the cloud alpha formula — it's currently using a confused expression**

Find:
```ts
      const cloudAlpha = world.id === "storm" || world.id === "lava"
        ? 0.1 * (1 - g.transitionT) + (world.id === "storm" || world.id === "lava" ? 0.1 : 0.55) * g.transitionT
        : 0.55;
```

Replace with a clean lerp between from-world and to-world alphas:
```ts
      const fromCloudAlpha = (g.fromSkyTop === "#0d0d1a" || g.fromSkyTop === "#1a0500") ? 0.1 : 0.55;
      const toCloudAlpha = (world.id === "storm" || world.id === "lava") ? 0.1 : 0.55;
      const cloudAlpha = fromCloudAlpha + (toCloudAlpha - fromCloudAlpha) * g.transitionT;
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 3: Browser verify end-to-end**

1. Start game — slow initial speed, character clearly visible with shadow
2. Run to 300 — smooth sunset transition, clouds still visible
3. Run to 600 — clouds fade, stars appear, dark sky gradient
4. Run to 1000 — lava cracks animate on ground, fiery sky

**Step 4: Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "fix(runner): clean up cloud alpha lerp across world transitions"
```
