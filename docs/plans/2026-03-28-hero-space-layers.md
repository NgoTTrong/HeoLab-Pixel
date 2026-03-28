# Hero Space Layers — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3 animated space layers to the hero: slow-drifting planets (CSS), flying meteors (JS/RAF), and a mini space battle with laser fire (JS/RAF).

**Architecture:** Planets are pure CSS keyframe elements added to JSX. Meteors and ships are `position:absolute` divs created imperatively inside the existing `useEffect`, driven by the existing RAF `tick` loop. Lasers are short-lived divs spawned per ship fire. All objects are cleaned up in the `useEffect` return. Desktop only.

**Tech Stack:** Next.js 16 App Router, TypeScript, CSS keyframes, `requestAnimationFrame` (existing loop in `src/app/page.tsx`).

---

### Task 1: Add `planetDrift` keyframe to globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Read the file to find where to insert**

Read `src/app/globals.css` and locate the `particleFade` keyframe block (around line 329).

**Step 2: Add keyframe after `particleFade`**

Find:
```css
@keyframes particleFade {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-8px) scale(0.3); }
}
```

Add immediately after it:
```css
@keyframes planetDrift {
  0%   { transform: translate(0px, 0px) rotate(0deg); }
  100% { transform: translate(12px, 20px) rotate(6deg); }
}
```

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add planetDrift keyframe for hero background planets"
```

---

### Task 2: Add planet JSX elements to hero section

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Read page.tsx to find the floating emojis JSX block**

Read `src/app/page.tsx`. Find this comment in JSX:
```tsx
          {/* Floating emojis — desktop only, physics-driven */}
```

**Step 2: Add planet layer before the floating emojis block**

Find the exact text:
```tsx
          {/* Floating emojis — desktop only, physics-driven */}
          <div className="hidden md:block absolute inset-0 pointer-events-none select-none">
```

Replace with:
```tsx
          {/* Planets — background, CSS-driven */}
          <div className="hidden md:block absolute inset-0 pointer-events-none select-none">
            <div
              className="absolute text-[4rem] opacity-[0.10]"
              style={{ top: "6%", right: "12%", animation: "planetDrift 55s ease-in-out infinite alternate" }}
            >🪐</div>
            <div
              className="absolute text-[3rem] opacity-[0.10]"
              style={{ bottom: "8%", left: "5%", animation: "planetDrift 70s ease-in-out 8s infinite alternate-reverse" }}
            >🌍</div>
          </div>

          {/* Floating emojis — desktop only, physics-driven */}
          <div className="hidden md:block absolute inset-0 pointer-events-none select-none">
```

**Step 3: Verify build**

```bash
cd "E:\Personal\GameStation" && npm run build
```

Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add planet background layer to hero"
```

---

### Task 3: Add types, helpers, and constants for meteors and ships

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add types after `EmojiPhysics`**

Find:
```tsx
type EmojiPhysics = {
  relX: number;
  relY: number;
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
};
```

Replace with:
```tsx
type EmojiPhysics = {
  relX: number;
  relY: number;
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
};

type Meteor = { x: number; y: number; vx: number; vy: number; el: HTMLDivElement };
type Ship   = {
  cx: number; cy: number; rx: number; ry: number;
  angle: number; speed: number;
  el: HTMLDivElement;
  fireIn: number;
};
type Laser  = { x: number; y: number; vx: number; vy: number; el: HTMLDivElement; ttl: number };
```

**Step 2: Add helper and constants after the `floatingEmojis` array**

Find:
```tsx
const stats = [
```

Add before it:
```tsx
// ── Space layer helpers ──────────────────────────────────
const mkMeteorState = (W: number, H: number, el: HTMLDivElement): Meteor => {
  const edge = Math.floor(Math.random() * 3); // 0=top 1=left 2=right
  const spd  = 1.2 + Math.random() * 2.0;
  let x: number, y: number, tx: number, ty: number;
  if (edge === 0)      { x = Math.random() * W; y = -50;    tx = Math.random() * W; ty = H + 50; }
  else if (edge === 1) { x = -50;    y = Math.random() * H; tx = W + 50; ty = Math.random() * H; }
  else                 { x = W + 50; y = Math.random() * H; tx = -50;    ty = Math.random() * H; }
  const d = Math.hypot(tx - x, ty - y) || 1;
  return { x, y, vx: (tx - x) / d * spd, vy: (ty - y) / d * spd, el };
};

const SHIP_CONFIGS = [
  { cx: 0.20, cy: 0.30, rx: 130, ry: 55, speed:  0.40, a0: 0 },
  { cx: 0.78, cy: 0.22, rx:  90, ry: 70, speed: -0.35, a0: Math.PI },
  { cx: 0.55, cy: 0.72, rx: 160, ry: 45, speed:  0.50, a0: Math.PI / 2 },
] as const;

const LASER_COLORS = ["#39ff14", "#00d4ff", "#ff2d95"] as const;

```

**Step 3: Build check**

```bash
cd "E:\Personal\GameStation" && npm run build
```

Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add space layer types, helpers, and ship configs"
```

---

### Task 4: Create meteor and ship elements in useEffect

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add creation code inside useEffect**

Find this exact block inside the `useEffect`:
```tsx
    initPhysics();
    window.addEventListener("resize", initPhysics);

    // ── Particle spawn ────────────────────────────────────
```

Replace with:
```tsx
    initPhysics();
    window.addEventListener("resize", initPhysics);

    // ── Space objects (meteors + ships) ───────────────────
    const { width: W0, height: H0 } = hero.getBoundingClientRect();

    const meteors: Meteor[] = Array.from({ length: 5 }, () => {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;font-size:1.25rem;pointer-events:none;opacity:0.55;z-index:1;will-change:transform;user-select:none;";
      el.textContent = "☄️";
      hero.appendChild(el);
      return mkMeteorState(W0, H0, el);
    });

    const ships: Ship[] = SHIP_CONFIGS.map((cfg, i) => {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;font-size:1rem;pointer-events:none;opacity:0.55;z-index:2;will-change:transform;user-select:none;";
      el.textContent = "🚀";
      hero.appendChild(el);
      return {
        cx: cfg.cx, cy: cfg.cy, rx: cfg.rx, ry: cfg.ry,
        angle: cfg.a0, speed: cfg.speed, el,
        fireIn: 80 + i * 40 + Math.floor(Math.random() * 60),
      };
    });

    const lasers: Laser[] = [];

    // ── Particle spawn ────────────────────────────────────
```

**Step 2: Add laser spawn helper** — add this right after the `lasers` array declaration (before the `// ── Particle spawn` comment):

Find the exact line:
```tsx
    const lasers: Laser[] = [];

    // ── Particle spawn ────────────────────────────────────
```

Replace with:
```tsx
    const lasers: Laser[] = [];

    const spawnLaser = (sx: number, sy: number, tdx: number, tdy: number) => {
      if (lasers.length >= 6) return;
      const d = Math.hypot(tdx, tdy) || 1;
      const spd = 4;
      const vx = (tdx / d) * spd;
      const vy = (tdy / d) * spd;
      const color = LASER_COLORS[Math.floor(Math.random() * LASER_COLORS.length)];
      const rot   = Math.atan2(vy, vx) * (180 / Math.PI);
      const el    = document.createElement("div");
      el.style.cssText = [
        "position:absolute",
        `left:${sx}px`, `top:${sy}px`,
        "width:22px", "height:2px",
        `background:${color}`,
        `box-shadow:0 0 6px ${color}`,
        "pointer-events:none", "z-index:3",
        `transform:rotate(${rot}deg)`,
        "transform-origin:left center",
      ].join(";");
      hero.appendChild(el);
      lasers.push({ x: sx, y: sy, vx, vy, el, ttl: 90 });
    };

    // ── Particle spawn ────────────────────────────────────
```

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: create meteor/ship/laser elements in useEffect"
```

---

### Task 5: Drive meteors, ships, lasers in the RAF tick

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add space object updates to the tick function**

Find this exact block in the `tick` function:
```tsx
      rafRef.current = requestAnimationFrame(tick);
    };
```

There should be exactly one of these at the very end of `tick`. Replace it with:
```tsx
      // ── Meteors ──────────────────────────────────────────
      const W = heroRect.width;
      const H = heroRect.height;

      meteors.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < -80 || m.x > W + 80 || m.y < -80 || m.y > H + 80) {
          Object.assign(m, mkMeteorState(W, H, m.el));
        }
        const ang = Math.atan2(m.vy, m.vx) * (180 / Math.PI);
        m.el.style.transform = `translate(${m.x}px, ${m.y}px) rotate(${ang}deg)`;
      });

      // ── Ships & Lasers ────────────────────────────────────
      ships.forEach((s) => {
        s.angle += s.speed / 60;

        const sx = s.cx * W + Math.cos(s.angle) * s.rx;
        const sy = s.cy * H + Math.sin(s.angle) * s.ry;

        // Tangent direction (derivative of orbit)
        const tdx = -Math.sin(s.angle) * s.rx * s.speed;
        const tdy =  Math.cos(s.angle) * s.ry * s.speed;
        const rot  = Math.atan2(tdy, tdx) * (180 / Math.PI) - 90;

        s.el.style.transform = `translate(${sx}px, ${sy}px) rotate(${rot}deg)`;

        // Fire laser
        s.fireIn--;
        if (s.fireIn <= 0) {
          s.fireIn = 100 + Math.floor(Math.random() * 120);
          spawnLaser(sx, sy, tdx, tdy);
        }
      });

      // Advance + cull lasers (iterate in reverse to splice safely)
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.x += l.vx;
        l.y += l.vy;
        l.ttl--;
        if (l.ttl <= 0 || l.x < -30 || l.x > W + 30 || l.y < -30 || l.y > H + 30) {
          l.el.remove();
          lasers.splice(i, 1);
        } else {
          l.el.style.left = `${l.x}px`;
          l.el.style.top  = `${l.y}px`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
```

**Step 2: Add cleanup for space objects**

Find the cleanup return block:
```tsx
    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", initPhysics);
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseenter", handleMouseEnter);
      hero.removeEventListener("mouseleave", handleMouseLeave);
      liveParticlesRef.current.forEach((el) => el.remove());
      liveParticlesRef.current = [];
    };
```

Replace with:
```tsx
    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", initPhysics);
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseenter", handleMouseEnter);
      hero.removeEventListener("mouseleave", handleMouseLeave);
      liveParticlesRef.current.forEach((el) => el.remove());
      liveParticlesRef.current = [];
      meteors.forEach((m) => m.el.remove());
      ships.forEach((s) => s.el.remove());
      lasers.forEach((l) => l.el.remove());
    };
```

**Step 3: Run build**

```bash
cd "E:\Personal\GameStation" && npm run build
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: drive meteors, ships, and lasers in RAF tick"
```
