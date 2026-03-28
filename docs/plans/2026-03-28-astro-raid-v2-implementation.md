# Astro Raid v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 high-impact features to Astro Raid: retro sound, combo multiplier, diverse alien behaviors, 2 new power-ups, and 3 unique bosses.

**Architecture:** Phased additions to existing files. New `audio.ts` module for sound. All game logic stays in `page.tsx` draw loop and `gameRef`. No major refactoring.

**Tech Stack:** Web Audio API (procedural sound), Canvas 2D, React hooks, TypeScript, Next.js 16 App Router

---

## Task 1: Audio Module + Bullet Speed

**Files:**
- Create: `src/games/space/audio.ts`
- Modify: `src/games/space/config.ts`
- Modify: `src/app/games/space/page.tsx`

### Step 1: Create `src/games/space/audio.ts`

```ts
export interface SpaceAudio {
  playShoot(): void;
  playExplosion(): void;
  playHit(): void;
  playPowerUp(): void;
  playBossDie(): void;
  playExtraLife(): void;
  playComboUp(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

export function createSpaceAudio(): SpaceAudio {
  let ctx: AudioContext | null = null;
  let muted = false;

  function getCtx(): AudioContext {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq: number, endFreq: number, dur: number, type: OscillatorType = "square", vol = 0.18, delay = 0) {
    if (muted) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = type;
      const t = c.currentTime + delay;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq !== freq) osc.frequency.linearRampToValueAtTime(endFreq, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t); osc.stop(t + dur);
    } catch { /* ignore AudioContext errors */ }
  }

  function noise(dur: number, vol = 0.2, delay = 0) {
    if (muted) return;
    try {
      const c = getCtx();
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      src.connect(gain); gain.connect(c.destination);
      const t = c.currentTime + delay;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      src.start(t);
    } catch { /* ignore */ }
  }

  return {
    playShoot()    { tone(700, 300, 0.08, "square", 0.12); },
    playExplosion(){ noise(0.18, 0.22); tone(120, 40, 0.18, "sawtooth", 0.14); },
    playHit()      { tone(180, 70, 0.13, "square", 0.17); },
    playPowerUp()  { [261, 330, 392, 523].forEach((f, i) => tone(f, f, 0.09, "sine", 0.18, i * 0.075)); },
    playBossDie()  { noise(0.5, 0.32); [180, 130, 90, 55].forEach((f, i) => tone(f, f * 0.5, 0.14, "sawtooth", 0.24, i * 0.1)); },
    playExtraLife(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.09, "sine", 0.2, i * 0.08)); },
    playComboUp()  { tone(500, 850, 0.09, "square", 0.13); },
    setMuted(m)    { muted = m; },
    isMuted()      { return muted; },
  };
}
```

### Step 2: Lower bullet speeds in `src/games/space/config.ts`

Change:
```ts
export const BULLET_SPEED = 9;
export const ALIEN_BULLET_SPEED = 4;
```

To:
```ts
export const BULLET_SPEED = 6;
export const ALIEN_BULLET_SPEED = 3;
```

### Step 3: Integrate audio into `src/app/games/space/page.tsx`

**3a. Add import** at top of file, after existing imports:
```ts
import { createSpaceAudio } from "@/games/space/audio";
import type { SpaceAudio } from "@/games/space/audio";
```

**3b. Add ref inside component** (after `keysRef`):
```ts
const audioRef = useRef<SpaceAudio | null>(null);
const [muted, setMuted] = useState(() => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("space-sound-muted") === "1";
});
```

**3c. Initialize audio on first user gesture** — add this useEffect after the `setHS` useEffect:
```ts
useEffect(() => {
  // Lazy-init audio on mount (requires user gesture for AudioContext)
  const init = () => {
    if (!audioRef.current) {
      audioRef.current = createSpaceAudio();
      audioRef.current.setMuted(muted);
    }
  };
  window.addEventListener("pointerdown", init, { once: true });
  window.addEventListener("keydown", init, { once: true });
  return () => {
    window.removeEventListener("pointerdown", init);
    window.removeEventListener("keydown", init);
  };
}, [muted]);
```

**3d. Sync muted state to audio + localStorage**:
```ts
useEffect(() => {
  audioRef.current?.setMuted(muted);
  localStorage.setItem("space-sound-muted", muted ? "1" : "0");
}, [muted]);
```

**3e. Add sound calls in the game loop draw function:**

After `g.bullets.push(...)` (shooting section):
```ts
audioRef.current?.playShoot();
```

In bullet-alien collision, when `alien.hp <= 0`:
```ts
audioRef.current?.playExplosion();
```

In alien bullet-ship collision, when ship is hit:
```ts
audioRef.current?.playHit();
```

In power-up pickup (extraLife):
```ts
audioRef.current?.playExtraLife();
```

In power-up pickup (all other types):
```ts
audioRef.current?.playPowerUp();
```

In boss death (`g.boss.hp <= 0`):
```ts
audioRef.current?.playBossDie();
```

**3f. Add mute toggle button to JSX HUD** — in the score/wave/lives row, add:
```tsx
<button
  onClick={() => setMuted((m) => !m)}
  className="text-[0.5rem] text-gray-500 hover:text-gray-300 transition-colors"
  title={muted ? "Unmute" : "Mute"}
>
  {muted ? "🔇" : "🔊"}
</button>
```

### Step 4: Verify in browser

Run: `npm run dev` (if not already running)
Navigate to: `http://localhost:3000/games/space`
- Click LAUNCH — should hear start-of-game context (from pointer init)
- Move + hold Space to shoot — should hear shoot beep each shot
- Get hit by alien bullet — should hear low thud
- Pick up power-up — should hear ascending arpeggio
- Bullets should feel slower (more time to react/dodge)

### Step 5: Commit

```bash
git add src/games/space/audio.ts src/games/space/config.ts src/app/games/space/page.tsx
git commit -m "feat(space): add retro Web Audio sound effects and reduce bullet speed"
```

---

## Task 2: Combo Multiplier

**Files:**
- Modify: `src/app/games/space/page.tsx`

### Step 1: Add combo fields to `gameRef`

In the `gameRef = useRef({...})` object, add after `muzzleFlash: 0`:
```ts
// Combo
combo: 0,
comboMultiplier: 1,
comboDisplayTimer: 0,
prevMultiplier: 1,
```

### Step 2: Add combo logic — on alien kill

In the bullet-alien collision section, find the block where `alien.hp <= 0`:
```ts
if (alien.hp <= 0) {
  alien.alive = false;
  const baseScore = alien.maxHp > 1 ? 25 : 10;
  g.score += baseScore + g.wave * 2;
  setUiScore(g.score);
```

Replace with:
```ts
if (alien.hp <= 0) {
  alien.alive = false;
  // Combo
  g.combo++;
  g.prevMultiplier = g.comboMultiplier;
  g.comboMultiplier = g.combo >= 20 ? 4 : g.combo >= 10 ? 3 : g.combo >= 5 ? 2 : 1;
  g.comboDisplayTimer = 90;
  if (g.comboMultiplier > g.prevMultiplier) audioRef.current?.playComboUp();
  const baseScore = alien.maxHp > 1 ? 25 : 10;
  g.score += (baseScore + g.wave * 2) * g.comboMultiplier;
  setUiScore(g.score);
  audioRef.current?.playExplosion();
```

Also update the boss kill score:
```ts
g.score += 5;
setUiScore(g.score);
```
Replace with:
```ts
g.score += 5 * g.comboMultiplier;
setUiScore(g.score);
```

### Step 3: Reset combo on ship hit

In the alien bullet-ship collision, find:
```ts
g.lives--;
setUiLives(g.lives);
```

Add after these lines:
```ts
g.combo = 0;
g.comboMultiplier = 1;
g.comboDisplayTimer = 0;
audioRef.current?.playHit();
```

(Remove any existing `audioRef.current?.playHit()` call you added in Task 1 from this same block to avoid double play.)

### Step 4: Reset combo in `startGame`

In `startGame`, after `g.muzzleFlash = 0`:
```ts
g.combo = 0;
g.comboMultiplier = 1;
g.comboDisplayTimer = 0;
g.prevMultiplier = 1;
```

### Step 5: Count down comboDisplayTimer each frame

In the game loop, after `if (g.muzzleFlash > 0) g.muzzleFlash--;`, add:
```ts
if (g.comboDisplayTimer > 0) g.comboDisplayTimer--;
```

### Step 6: Render combo on canvas

In the draw section, after drawing power-ups and before drawing the ship, add:
```ts
// ── Draw combo multiplier ──────────────────────────
if (g.comboMultiplier > 1 && g.comboDisplayTimer > 0) {
  const alpha = Math.min(1, g.comboDisplayTimer / 30);
  const comboColor = g.comboMultiplier >= 4 ? "#ff2d95" : g.comboMultiplier === 3 ? "#ffe600" : "#39ff14";
  ctx.globalAlpha = alpha;
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = comboColor;
  ctx.shadowBlur = 10; ctx.shadowColor = comboColor;
  ctx.fillText(`×${g.comboMultiplier} COMBO!`, W - 8, 36);
  // Pulse scale when multiplier just changed
  if (g.comboDisplayTimer > 80) {
    const scale = 1 + (g.comboDisplayTimer - 80) / 80 * 0.3;
    ctx.font = `bold ${Math.round(11 * scale)}px monospace`;
    ctx.fillText(`×${g.comboMultiplier} COMBO!`, W - 8, 36);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
}
```

### Step 7: Verify in browser

- Play the game, kill multiple aliens without getting hit
- At 5 kills: "×2 COMBO!" appears in neon green top-right
- At 10 kills: "×3 COMBO!" in yellow
- At 20 kills: "×4 COMBO!" in pink
- Getting hit resets combo display

### Step 8: Commit

```bash
git add src/app/games/space/page.tsx
git commit -m "feat(space): add combo multiplier system (x1-x4 based on kill streak)"
```

---

## Task 3: Alien Behavior Diversity

**Files:**
- Modify: `src/app/games/space/page.tsx`

### Step 1: Update `Alien` interface

Replace:
```ts
interface Alien {
  col: number; row: number;
  x: number; y: number;
  alive: boolean;
  emoji: string;
  hp: number;
  maxHp: number;   // >1 = tank alien
}
```

With:
```ts
type AlienBehavior = "normal" | "zigzag" | "kamikaze" | "shield";

interface Alien {
  col: number; row: number;
  x: number; y: number;
  baseX: number;      // original X for zigzag oscillation
  alive: boolean;
  emoji: string;
  hp: number;
  maxHp: number;
  behavior: AlienBehavior;
  hasShield: boolean; // shield type: shield still active
  isDiving: boolean;  // kamikaze: currently diving toward ship
}
```

### Step 2: Rewrite `spawnAliens`

Replace the entire `spawnAliens` function with:
```ts
function spawnAliens(wave: number) {
  const g = gameRef.current;
  const startX = (W - (COLS * (ALIEN_SIZE + ALIEN_GAP))) / 2;
  g.aliens = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isTank = wave >= 3 && r === 0;

      let behavior: AlienBehavior = "normal";
      let emoji = "👾";
      let hp = 1;

      if (isTank) {
        emoji = "💀"; hp = 2;
      } else if (wave >= 5 && r === 1) {
        behavior = "shield"; emoji = "🤖"; hp = 2;
      } else if (wave >= 7 && r === ROWS - 1) {
        behavior = "kamikaze"; emoji = "🛸";
      } else if (wave >= 3 && r === ROWS - 1) {
        behavior = "zigzag"; emoji = "👽";
      } else if (wave >= 5 && r === ROWS - 2) {
        behavior = "zigzag"; emoji = "👽";
      } else {
        const roster = WAVE_ALIENS[Math.min(Math.floor((wave - 1) / 2), WAVE_ALIENS.length - 1)];
        emoji = roster[r % roster.length];
      }

      const x = startX + c * (ALIEN_SIZE + ALIEN_GAP);
      g.aliens.push({
        col: c, row: r,
        x, y: 80 + r * (ALIEN_SIZE + ALIEN_GAP),
        baseX: x,
        alive: true,
        emoji,
        hp, maxHp: hp,
        behavior,
        hasShield: behavior === "shield",
        isDiving: false,
      });
    }
  }

  g.alienMoveInterval = Math.max(12, 40 - wave * 2);
  g.pattern = WAVE_PATTERNS[(wave - 1) % WAVE_PATTERNS.length];
  g.alienDx = 1;
  g.zigzagAngle = 0;
}
```

### Step 3: Add per-alien behavior movement

In the alien movement section, AFTER the existing march/zigzag/dive block (`if (g.alienMoveTimer >= g.alienMoveInterval...)`), add:

```ts
// Per-alien individual behaviors
for (const alien of g.aliens) {
  if (!alien.alive) continue;

  if (alien.behavior === "zigzag") {
    // Override X with sine oscillation around baseX
    alien.x = alien.baseX + Math.sin(g.frame * 0.07 + alien.col * 1.1) * 20;
  }

  if (alien.behavior === "kamikaze" && !alien.isDiving) {
    // Trigger dive when fewer than COLS aliens alive or alien gets deep enough
    const liveCount = g.aliens.filter((a) => a.alive).length;
    if (liveCount < COLS || alien.y > H * 0.52) {
      alien.isDiving = true;
    }
  }

  if (alien.isDiving) {
    // Dive toward ship X
    const targetX = g.shipX + SHIP_W / 2 - ALIEN_SIZE / 2;
    alien.x += (targetX - alien.x) * 0.06;
    alien.y += 3.5;
  }
}

// Update baseX for non-zigzag aliens (so zigzag still follows formation X drift)
for (const alien of g.aliens) {
  if (alien.alive && alien.behavior !== "zigzag") {
    alien.baseX = alien.x;
  }
}
```

### Step 4: Update bullet-alien collision for shield

In the collision block where `alien.hp--` happens, replace:
```ts
alien.hp--;
bullet.y = -999;
if (alien.hp <= 0) {
  alien.alive = false;
  // Combo
  g.combo++;
```

With:
```ts
// Shield absorbs first hit
if (alien.hasShield) {
  alien.hasShield = false;
  bullet.y = -999;
  g.score += 5 * g.comboMultiplier;
  setUiScore(g.score);
  continue; // shield broken, alien survives
}
alien.hp--;
bullet.y = -999;
if (alien.hp <= 0) {
  alien.alive = false;
  // Combo
  g.combo++;
```

Also handle kamikaze reaching the ship — find the "alien reaches bottom" check:
```ts
if (alien.y + ALIEN_SIZE > SHIP_Y) {
```

Update to also check diving kamikaze hitting the ship area:
```ts
if (alien.y + ALIEN_SIZE > SHIP_Y || (alien.isDiving && alien.y + ALIEN_SIZE > SHIP_Y - 10)) {
```

### Step 5: Update alien rendering

In the draw-aliens section, after computing `bobY`, add shield and dive trail rendering:

```ts
// Dive trail for kamikaze
if (alien.isDiving) {
  ctx.shadowBlur = 0;
  for (let t = 1; t <= 4; t++) {
    ctx.globalAlpha = 0.15 * (5 - t) / 4;
    ctx.font = `${ALIEN_SIZE * 0.7}px serif`;
    ctx.fillText(alien.emoji, alien.x + 4, alien.y - t * 8 + bobY);
  }
  ctx.globalAlpha = 1;
}

// Shield visual
if (alien.hasShield) {
  ctx.beginPath();
  ctx.arc(alien.x + ALIEN_SIZE / 2, alien.y + ALIEN_SIZE / 2 + bobY, ALIEN_SIZE / 2 + 4, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0,212,255,${0.5 + Math.sin(g.frame * 0.1) * 0.2})`;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10; ctx.shadowColor = "#00d4ff";
  ctx.stroke();
  ctx.shadowBlur = 0;
}
```

### Step 6: Verify in browser

- Wave 1–2: all normal aliens
- Wave 3: bottom row zigzags independently of formation
- Wave 5: row 1 has shield aliens (🤖 with cyan ring), 2 hits to kill
- Wave 7+: bottom row kamikazes (🛸) dive toward ship when triggered
- Kamikaze leaves faint trail when diving

### Step 7: Commit

```bash
git add src/app/games/space/page.tsx
git commit -m "feat(space): add alien behavior diversity (zigzag, kamikaze, shield)"
```

---

## Task 4: New Power-ups (Homing Missile + Slow Time)

**Files:**
- Modify: `src/games/space/config.ts`
- Modify: `src/app/games/space/page.tsx`

### Step 1: Update `config.ts` — add new power-up types and entries

Update the type:
```ts
export type PowerUpType = "tripleShot" | "shield" | "bomb" | "rapidFire" | "extraLife" | "homingMissile" | "slowTime";
```

Add to `POWER_UPS` array (after the `extraLife` entry):
```ts
{ type: "homingMissile", emoji: "🎯", label: "HOMING MISSILE", color: "#ffe600", duration: null,  dropChance: 0.08 },
{ type: "slowTime",      emoji: "🐌", label: "SLOW TIME",      color: "#00d4ff", duration: 6000,  dropChance: 0.07 },
```

### Step 2: Add `HomingBullet` interface and new gameRef fields

Add interface near the top with other interfaces:
```ts
interface HomingBullet { x: number; y: number; angle: number; }
```

In `gameRef`, after `rapidEndsAt: 0`, add:
```ts
// Homing missiles
homingBullets: [] as HomingBullet[],
// Slow time
slowActive: false,
slowEndsAt: 0,
```

### Step 3: Add resets in `startGame`

After `g.activeRapid = false`:
```ts
g.homingBullets = [];
g.slowActive = false;
g.slowEndsAt = 0;
```

### Step 4: Add slow time expiry

In the power-up expiry section (where shield/triple/rapid are checked), add:
```ts
if (g.slowActive && now > g.slowEndsAt) {
  g.slowActive = false;
  setActivePowerUpLabel(
    g.activeShield ? "🛡️ SHIELD" : g.activeTriple ? "🔱 TRIPLE SHOT" : g.activeRapid ? "⚡ RAPID FIRE" : null
  );
}
```

### Step 5: Add homing missile movement + collision

In the bullet movement section (after `g.droppedPowerUps.forEach`), add:
```ts
// Homing missiles
g.homingBullets = g.homingBullets.filter((hb) => hb.y > -20 && hb.y < H + 20);
for (const hb of g.homingBullets) {
  // Find nearest alive alien
  const targets = g.aliens.filter((a) => a.alive);
  if (g.boss) {
    // Target boss
    const bossCenter = { x: g.boss.x + 40, y: g.boss.y + 25 };
    const dx = bossCenter.x - hb.x;
    const dy = bossCenter.y - hb.y;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - hb.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    hb.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.07);
  } else if (targets.length > 0) {
    // Target nearest alien
    let nearest = targets[0];
    let nearDist = Infinity;
    for (const a of targets) {
      const d = Math.hypot(a.x - hb.x, a.y - hb.y);
      if (d < nearDist) { nearDist = d; nearest = a; }
    }
    const dx = nearest.x + ALIEN_SIZE / 2 - hb.x;
    const dy = nearest.y + ALIEN_SIZE / 2 - hb.y;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - hb.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    hb.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.07);
  }
  hb.x += Math.cos(hb.angle) * 5;
  hb.y += Math.sin(hb.angle) * 5;
}
```

### Step 6: Add homing missile collision

In the bullet-alien collision section, after the regular `g.bullets` loop, add a separate homing bullet collision loop:
```ts
// Homing missile collision
for (const hb of g.homingBullets) {
  for (const alien of liveAliens) {
    if (
      hb.x > alien.x && hb.x < alien.x + ALIEN_SIZE &&
      hb.y > alien.y && hb.y < alien.y + ALIEN_SIZE
    ) {
      if (alien.hasShield) { alien.hasShield = false; hb.y = -999; continue; }
      alien.hp--;
      hb.y = -999;
      if (alien.hp <= 0) {
        alien.alive = false;
        g.combo++;
        g.comboMultiplier = g.combo >= 20 ? 4 : g.combo >= 10 ? 3 : g.combo >= 5 ? 2 : 1;
        g.comboDisplayTimer = 90;
        g.score += (25 + g.wave * 2) * g.comboMultiplier;
        setUiScore(g.score);
        audioRef.current?.playExplosion();
      }
    }
  }
  // Homing vs boss
  if (g.boss && !g.boss.shieldActive) {
    if (hb.x > g.boss.x && hb.x < g.boss.x + 80 && hb.y > g.boss.y && hb.y < g.boss.y + 50) {
      g.boss.hp -= 1;
      hb.y = -999;
      g.score += 5 * g.comboMultiplier;
      setUiScore(g.score);
      if (g.boss.hp <= 0) {
        // Boss kill handled in regular bullet section; reset here too
        g.boss = null;
        g.score += 300 + g.wave * 20;
        setUiScore(g.score);
        audioRef.current?.playBossDie();
        g.wave++;
        setUiWave(g.wave);
        spawnAliens(g.wave);
      }
    }
  }
}
```

### Step 7: Apply slow time to alien speeds

In the alien movement section, find where `g.alienMoveTimer >= g.alienMoveInterval`:
```ts
if (g.alienMoveTimer >= g.alienMoveInterval && liveAliens.length > 0) {
```

Change the condition so slow time requires double the interval to fire:
```ts
const effectiveInterval = g.slowActive ? g.alienMoveInterval * 2.5 : g.alienMoveInterval;
if (g.alienMoveTimer >= effectiveInterval && liveAliens.length > 0) {
```

Also slow alien bullets — in the bullet movement section:
```ts
g.alienBullets.forEach((b) => { b.y += ALIEN_BULLET_SPEED; });
```

Change to:
```ts
const alienBulletSpeed = g.slowActive ? ALIEN_BULLET_SPEED * 0.4 : ALIEN_BULLET_SPEED;
g.alienBullets.forEach((b) => { b.y += alienBulletSpeed; });
```

### Step 8: Add power-up pickup handling

In the power-up pickup section, add cases for the two new types (after `extraLife`):
```ts
} else if (pu.type === "homingMissile") {
  const cx = g.shipX + SHIP_W / 2;
  // Fire 3 homing missiles upward
  [-0.4, -Math.PI / 2, -Math.PI + 0.4].forEach((angle) => {
    g.homingBullets.push({ x: cx, y: SHIP_Y - 4, angle });
  });
  audioRef.current?.playPowerUp();
  setActivePowerUpLabel("🎯 HOMING MISSILE!");
  setTimeout(() => setActivePowerUpLabel(null), 1500);
} else if (pu.type === "slowTime") {
  g.slowActive = true;
  g.slowEndsAt = now + (def.duration ?? 6000);
  setActivePowerUpLabel("🐌 SLOW TIME");
  audioRef.current?.playPowerUp();
}
```

### Step 9: Draw homing bullets + slow overlay

**Homing bullets** — add in draw section after player bullets:
```ts
// ── Draw homing missiles ────────────────────────────
for (const hb of g.homingBullets) {
  ctx.save();
  ctx.translate(hb.x, hb.y);
  ctx.rotate(hb.angle - Math.PI / 2);
  ctx.fillStyle = "#ffe600";
  ctx.shadowBlur = 10; ctx.shadowColor = "#ffe600";
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(4, 4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  // Smoke trail
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#fff";
  ctx.fillRect(-1, 5, 2, 4);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.restore();
}
```

**Slow time overlay** — add right after clearing canvas (after `ctx.fillRect(0,0,W,H)`):
```ts
// Slow time vignette
if (g.slowActive) {
  const grad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.8);
  grad.addColorStop(0, "rgba(0,212,255,0)");
  grad.addColorStop(1, "rgba(0,212,255,0.08)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}
```

### Step 10: Verify in browser

- Kill an alien, get 🎯 power-up: 3 yellow missiles fire and curve toward enemies
- Kill an alien, get 🐌 power-up: screen gets subtle cyan vignette, aliens visibly slow down, HUD shows "🐌 SLOW TIME", lasts 6s
- Homing missiles correctly target boss during boss wave

### Step 11: Commit

```bash
git add src/games/space/config.ts src/app/games/space/page.tsx
git commit -m "feat(space): add homing missile and slow time power-ups"
```

---

## Task 5: Boss Diversity (3 Unique Bosses)

**Files:**
- Modify: `src/app/games/space/page.tsx`

### Step 1: Update `Boss` interface

Replace:
```ts
interface Boss { x: number; y: number; hp: number; maxHp: number; vx: number; phase: number; }
```

With:
```ts
interface Boss {
  x: number; y: number;
  hp: number; maxHp: number;
  vx: number;
  phase: number;
  type: 1 | 2 | 3;         // 1=Spreader, 2=Summoner, 3=Sniper
  // Boss 2 (Summoner)
  shieldActive: boolean;
  shieldTimer: number;      // frames remaining; set to -1 once used
  // Boss 3 (Sniper)
  chargeTimer: number;      // counts up; charge fires at 300
  chargeWarning: boolean;   // flashing warning before charge shot
  chargeWarningTimer: number;
  stepTimer: number;        // counts up; teleport-step every 45 frames
}
```

### Step 2: Update `spawnBoss`

Replace:
```ts
function spawnBoss(wave: number): Boss {
  return { x: W / 2 - 40, y: 60, hp: 20 + wave * 5, maxHp: 20 + wave * 5, vx: 2 + wave * 0.3, phase: 1 };
}
```

With:
```ts
function spawnBoss(wave: number): Boss {
  const bossIndex = ((Math.floor(wave / BOSS_EVERY_N_WAVES) - 1) % 3 + 1) as 1 | 2 | 3;
  const hp = 20 + wave * 5;
  return {
    x: W / 2 - 40, y: 60,
    hp, maxHp: hp,
    vx: 2 + wave * 0.3,
    phase: 1,
    type: bossIndex,
    shieldActive: false, shieldTimer: 0,
    chargeTimer: 0, chargeWarning: false, chargeWarningTimer: 0,
    stepTimer: 0,
  };
}
```

### Step 3: Replace boss movement section

Find and replace the entire `// ── BOSS MOVEMENT ──` section with:

```ts
// ── BOSS MOVEMENT ──────────────────────────────────
if (g.boss) {
  const hpRatio = g.boss.hp / g.boss.maxHp;
  g.boss.phase = hpRatio < 0.3 ? 3 : hpRatio < 0.6 ? 2 : 1;

  if (g.boss.type === 1) {
    // ── Boss 1: The Spreader ──
    g.boss.x += g.boss.vx * (g.boss.phase === 2 ? 1.5 : g.boss.phase === 3 ? 2 : 1);
    if (g.boss.x <= 0 || g.boss.x + 80 >= W) g.boss.vx *= -1;

    if (g.frame % 28 === 0) {
      const shots = g.boss.phase === 3 ? 5 : g.boss.phase === 2 ? 4 : 2;
      for (let i = 0; i < shots; i++) {
        const spread = (i - (shots - 1) / 2) * 18;
        g.alienBullets.push({ x: g.boss.x + 40 + spread, y: g.boss.y + 50 });
      }
      // Phase 3: 2 targeted shots
      if (g.boss.phase === 3 && g.frame % 56 === 0) {
        g.alienBullets.push({ x: g.boss.x + 40, y: g.boss.y + 50 });
        g.alienBullets.push({ x: g.boss.x + 40, y: g.boss.y + 50 });
      }
    }

  } else if (g.boss.type === 2) {
    // ── Boss 2: The Summoner ──
    g.boss.x += g.boss.vx;
    if (g.boss.x <= 0 || g.boss.x + 80 >= W) g.boss.vx *= -1;
    g.boss.y = 70 + Math.sin(g.frame * 0.04) * 30;

    // Shield phase at 50% HP (once)
    if (!g.boss.shieldActive && g.boss.shieldTimer === 0 && hpRatio < 0.5) {
      g.boss.shieldActive = true;
      g.boss.shieldTimer = 180; // 3 seconds
    }
    if (g.boss.shieldActive) {
      g.boss.shieldTimer--;
      if (g.boss.shieldTimer <= 0) {
        g.boss.shieldActive = false;
        g.boss.shieldTimer = -1; // mark used
      }
    }

    // Summon minions every 180 frames
    if (g.frame % 180 === 0 && g.frame > 0) {
      const sx = (W - 5 * (ALIEN_SIZE + ALIEN_GAP)) / 2;
      for (let c = 0; c < 5; c++) {
        const mx = sx + c * (ALIEN_SIZE + ALIEN_GAP);
        g.aliens.push({
          col: c, row: 5,
          x: mx, y: 150,
          baseX: mx,
          alive: true,
          emoji: "👻",
          hp: 1, maxHp: 1,
          behavior: "normal",
          hasShield: false,
          isDiving: false,
        });
      }
    }

    // Shoot toward ship every 90 frames (skip when shielded)
    if (!g.boss.shieldActive && g.frame % 90 === 0) {
      const cx = g.boss.x + 40;
      g.alienBullets.push({ x: cx - 16, y: g.boss.y + 50 });
      g.alienBullets.push({ x: cx + 16, y: g.boss.y + 50 });
    }

  } else if (g.boss.type === 3) {
    // ── Boss 3: The Sniper ──
    g.boss.y = 70; // always fixed Y

    // Step movement: teleport 80px left or right every 45 frames
    g.boss.stepTimer++;
    if (g.boss.stepTimer >= 45) {
      g.boss.stepTimer = 0;
      const dir = Math.random() > 0.5 ? 1 : -1;
      g.boss.x = Math.max(0, Math.min(W - 80, g.boss.x + dir * 80));
    }

    // Charge shot every 300 frames
    g.boss.chargeTimer++;
    if (g.boss.chargeTimer >= 300) {
      if (!g.boss.chargeWarning) {
        g.boss.chargeWarning = true;
        g.boss.chargeWarningTimer = 90; // warn for 1.5s
      }
      if (g.boss.chargeWarning) {
        g.boss.chargeWarningTimer--;
        if (g.boss.chargeWarningTimer <= 0) {
          // Fire 8-way burst
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            // Store angle in x/y as velocity — use a different approach:
            // push multiple bullets in different directions
            const speed = 3;
            const bx = g.boss.x + 40 + Math.cos(angle) * 30;
            const by = g.boss.y + 25 + Math.sin(angle) * 20;
            g.alienBullets.push({ x: bx, y: by });
          }
          g.boss.chargeTimer = 0;
          g.boss.chargeWarning = false;
        }
      }
    }

    // Regular targeted shot every 35 frames (not during charge warning)
    if (!g.boss.chargeWarning && g.frame % 35 === 0) {
      // Aimed at ship's current X
      g.alienBullets.push({ x: g.shipX + SHIP_W / 2, y: g.boss.y + 50 });
    }
  }
}
```

> **Note on Boss 3 8-way burst:** The current `AlienBullet` only has `{x, y}` and always moves straight down. The 8 bullets all start at different positions around the boss — they'll all fall straight down forming a spray pattern. For a true 8-way, you'd need velocity vectors on AlienBullet. This simplified version is still visually interesting and avoids a major refactor.

### Step 4: Update boss bullet collision to respect Boss 2 shield

Find the bullet-boss collision:
```ts
if (g.boss) {
  if (bullet.x > g.boss.x && bullet.x < g.boss.x + 80 && bullet.y > g.boss.y && bullet.y < g.boss.y + 50) {
    g.boss.hp -= 1;
```

Wrap the HP reduction with shield check:
```ts
if (g.boss) {
  if (bullet.x > g.boss.x && bullet.x < g.boss.x + 80 && bullet.y > g.boss.y && bullet.y < g.boss.y + 50) {
    if (g.boss.shieldActive) {
      bullet.y = -999; // bullets bounce off shield
    } else {
      g.boss.hp -= 1;
```

Add a closing brace after the boss kill block for the new else.

### Step 5: Update boss rendering (per-type)

Replace the entire boss draw section with:
```ts
// ── Draw boss (per-type rendering) ────────────────
if (g.boss) {
  const bossEmoji  = g.boss.type === 2 ? "🤖" : g.boss.type === 3 ? "💀" : "👾";
  const bossColor  = g.boss.phase === 3 ? "#ff2d95" : g.boss.phase === 2 ? "#ffe600" : "#a855f7";
  const bossBob    = Math.sin(g.frame * 0.08) * 5;
  const bossScale  = 60 + Math.sin(g.frame * 0.1) * 4;

  // Charge warning for Boss 3
  if (g.boss.chargeWarning) {
    const warnAlpha = 0.4 + Math.sin(g.frame * 0.4) * 0.4;
    ctx.fillStyle = `rgba(255,45,149,${warnAlpha})`;
    ctx.fillRect(0, 0, W, H * 0.25);
    // Draw targeting reticle at ship position
    ctx.strokeStyle = `rgba(255,45,149,${warnAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.shipX + SHIP_W / 2, g.boss.y + 50);
    ctx.lineTo(g.shipX + SHIP_W / 2, SHIP_Y);
    ctx.stroke();
  }

  // Boss 2 shield aura
  if (g.boss.shieldActive) {
    ctx.beginPath();
    ctx.arc(g.boss.x + 40, g.boss.y + 30 + bossBob, 52, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,212,255,${0.6 + Math.sin(g.frame * 0.2) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20; ctx.shadowColor = "#00d4ff";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Boss emoji
  ctx.shadowBlur = 20 + Math.sin(g.frame * 0.15) * 8;
  ctx.shadowColor = bossColor;
  ctx.font = `${bossScale}px serif`;
  ctx.fillText(bossEmoji, g.boss.x, g.boss.y + bossBob);
  ctx.shadowBlur = 0;

  // HP bar
  const hpW = 140;
  const hpRatio = g.boss.hp / g.boss.maxHp;
  ctx.fillStyle = "#222";
  ctx.fillRect(W / 2 - hpW / 2, 18, hpW, 10);
  ctx.fillStyle = g.boss.shieldActive ? "#00d4ff" : bossColor;
  ctx.shadowBlur = 6; ctx.shadowColor = g.boss.shieldActive ? "#00d4ff" : bossColor;
  ctx.fillRect(W / 2 - hpW / 2, 18, hpW * hpRatio, 10);
  ctx.shadowBlur = 0;
  const bossName = g.boss.type === 2 ? "THE SUMMONER" : g.boss.type === 3 ? "THE SNIPER" : "THE SPREADER";
  ctx.fillStyle = "#fff";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${bossName}  HP ${g.boss.hp}/${g.boss.maxHp}`, W / 2, 12);
  ctx.textAlign = "left";
}
```

### Step 6: Verify in browser

- Wave 5: "THE SPREADER" (👾) appears, shoots spread patterns
- Wave 10: "THE SUMMONER" (🤖) appears, moves in sine wave, spawns 5 ghost minions every 3s, gets cyan shield at 50% HP
- Wave 15: "THE SNIPER" (💀) appears, teleports every 45 frames, aimed single shots, red warning flash + 8-bullet burst every 5s
- Each boss has their name in the HP bar label

### Step 7: Commit

```bash
git add src/app/games/space/page.tsx
git commit -m "feat(space): add 3 unique bosses (Spreader, Summoner, Sniper)"
```

---

## Final Verification

After all 5 tasks, do a full play-through:

1. Wave 1-2: normal gameplay, sound effects work, combo builds
2. Wave 3: zigzag row appears, tank row (💀) on top
3. Wave 5: shield aliens (🤖) on row 1, "THE SPREADER" boss
4. Wave 7+: kamikaze row dives toward ship
5. Power-ups: all 7 types work (tripleShot, shield, bomb, rapidFire, extraLife, homingMissile, slowTime)
6. Combo: kills build combo, hit resets it, multiplier shown top-right
7. Sound: shoot, explosion, hit, powerup, boss die all play
8. Mute toggle: 🔊/🔇 persists across page refresh

```bash
git log --oneline -6
# Should show 5 feature commits + design doc commit
```
