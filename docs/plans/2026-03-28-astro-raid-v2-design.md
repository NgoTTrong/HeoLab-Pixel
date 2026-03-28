# Astro Raid v2 — Feature Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to implement this design.

**Goal:** Enhance Astro Raid with 5 high-impact features: retro sound, combo multiplier, diverse alien behaviors, 2 new power-ups, and 3 unique bosses.

**Architecture:** Phased additions directly to `page.tsx` and `config.ts`. New `audio.ts` module for sound. No major refactoring — extend existing canvas draw loop and gameRef state.

**Tech Stack:** Web Audio API (procedural sound), Canvas 2D, React hooks, TypeScript

---

## Feature 1: Retro Sound (Web Audio API)

**File:** `src/games/space/audio.ts` (new)

Create a `createSpaceAudio()` factory that returns sound functions. All sounds procedurally generated — no audio files needed.

| Function | Sound Design |
|----------|-------------|
| `playShoot()` | Square wave, 800Hz → 400Hz, 80ms |
| `playExplosion()` | Noise burst, 200ms, low frequency |
| `playHit()` | Low thud, 150ms |
| `playPowerUp()` | Ascending arpeggio (C-E-G), 300ms |
| `playBossDie()` | Big explosion sequence, 600ms |
| `playExtraLife()` | Cheerful jingle, 400ms |
| `playComboUp()` | Short ascending blip, 100ms |

**Integration:**
- Call `createSpaceAudio()` once in the component (lazy, after first user gesture)
- Pass audio object into `startGame()` and game loop
- Sound toggle button (🔊/🔇) in HUD, state persisted to `localStorage` key `"space-sound"`

**Bullet speed reduction:**
- `BULLET_SPEED`: 9 → 6 (in `config.ts`)
- `ALIEN_BULLET_SPEED`: 4 → 3 (in `config.ts`)

---

## Feature 2: Combo Multiplier

**State added to `gameRef`:**
```ts
combo: number;          // kill streak counter
comboMultiplier: number; // 1 | 2 | 3 | 4
comboDisplayTimer: number; // frames to show combo label
```

**Multiplier tiers:**
| Kills streak | Multiplier | Display color |
|-------------|-----------|---------------|
| 0–4 | ×1 | — (hidden) |
| 5–9 | ×2 | #39ff14 (neon green) |
| 10–19 | ×3 | #ffe600 (neon yellow) |
| 20+ | ×4 | #ff2d95 (neon pink, pulse) |

**Logic:**
- Each alien kill: `combo++`, recompute multiplier, apply to score: `score += baseScore * multiplier`
- Ship hit: `combo = 0`, multiplier back to ×1
- `comboDisplayTimer` resets to 90 frames on each kill, counts down to 0

**Rendering (on canvas, not React HUD):**
- Draw `×2 COMBO!` at top-right corner of canvas when multiplier > 1
- Alpha fades out as `comboDisplayTimer` approaches 0
- Flash/scale pulse when tier changes (×1→×2, ×2→×3, etc.)

---

## Feature 3: Alien Behavior Diversity

**New alien types** added to `Alien` interface:
```ts
type AlienBehavior = "normal" | "zigzag" | "kamikaze" | "shield";
interface Alien {
  // ... existing fields ...
  behavior: AlienBehavior;
  hasShield: boolean;    // for shield type: shield still active
  isDiving: boolean;     // for kamikaze: currently diving toward ship
}
```

**Behavior definitions:**

**`zigzag`** (emoji: 👽)
- Moves independently of formation: sinusoidal X offset = `sin(frame * 0.08 + col * 1.2) * 18`
- Still marches down with formation Y, but X is offset
- Drop chance for power-ups same as normal

**`kamikaze`** (emoji: 🛸)
- Moves with formation until trigger: `liveAliens.length < COLS` (less than one full row) OR `alien.y > H * 0.55`
- On trigger: `isDiving = true`, move straight toward ship X at 2× speed, descend fast
- If reaches bottom → ship takes damage (same as alien reaching ship)
- Visual: red trail drawn behind when diving

**`shield`** (emoji: 🤖)
- `hp = 2`, `hasShield = true` initially
- First hit: `hasShield = false` (shield visual removed), hp goes to 1
- Second hit: alien dies
- Visual: cyan circle (`#00d4ff`, radius 20, alpha 0.4) around alien when `hasShield = true`
- Flash white on shield break

**Wave composition** (updated `spawnAliens`):
| Wave | Row 0 | Row 1 | Row 2 | Row 3 |
|------|-------|-------|-------|-------|
| 1–2 | normal | normal | normal | normal |
| 3–4 | normal | zigzag | normal | normal |
| 5–6 | shield | zigzag | normal | kamikaze |
| 7–8 | shield | zigzag | kamikaze | kamikaze |
| 9+ | shield | shield | zigzag+kamikaze mix | kamikaze |

Note: wave 3+ top row still becomes tank (💀, 2HP) as currently implemented.

---

## Feature 4: New Power-ups

**`homingMissile`** added to `POWER_UPS` in `config.ts`:
- `emoji`: 🎯
- `label`: "HOMING MISSILE"
- `color`: #ffe600
- `duration`: null (instant — fires 3 homing projectiles immediately on pickup)
- `dropChance`: 0.08

**Homing missile logic:**
- On pickup: push 3 `HomingBullet` objects into `g.homingBullets[]`
- Each frame: find nearest alive alien → compute angle toward it → move bullet along that angle at speed 5
- Turn rate: max 4° per frame (smooth tracking, not instant)
- Collision: same as regular bullet
- Visual: yellow `#ffe600` arrowhead (triangle), length 10px, smoke trail (3 fading dots behind)

**`slowTime`** added to `POWER_UPS` in `config.ts`:
- `emoji`: 🐌
- `label`: "SLOW TIME"
- `color`: #00d4ff
- `duration`: 6000ms
- `dropChance`: 0.07

**Slow time logic:**
- `g.slowActive: boolean`, `g.slowEndsAt: number` in gameRef
- When active: alien movement speed × 0.4, alien bullet speed × 0.5
- Canvas: subtle cyan vignette overlay (semi-transparent `#00d4ff` at 4% alpha on canvas edges)
- HUD label: "🐌 SLOW TIME"

**New gameRef fields:**
```ts
homingBullets: HomingBullet[];
slowActive: boolean;
slowEndsAt: number;
```

**New interface:**
```ts
interface HomingBullet {
  x: number; y: number;
  angle: number; // radians, current direction
}
```

---

## Feature 5: Boss Diversity (3 Bosses)

**Boss selection:** `(Math.floor((wave / BOSS_EVERY_N_WAVES) - 1) % 3) + 1` → 1, 2, or 3

**Updated `Boss` interface:**
```ts
interface Boss {
  x: number; y: number;
  hp: number; maxHp: number;
  vx: number; vy: number;       // velocity
  phase: number;                 // 1 | 2 | 3
  type: 1 | 2 | 3;
  shieldActive: boolean;         // Boss 2 shield
  shieldTimer: number;           // frames of shield remaining
  chargeTimer: number;           // Boss 3 charge shot countdown
  chargeWarning: boolean;        // Boss 3 warning flash
}
```

---

### Boss 1 — "The Spreader" (👾)
*Enhanced version of current boss*

- Moves horizontally, bounces off walls
- Shoots spread fan of bullets every 28 frames
- **Phase 1** (HP > 60%): 2-shot spread
- **Phase 2** (HP 30–60%): 4-shot spread + faster movement
- **Phase 3** (HP < 30%): 5-shot spread + 2 targeted shots toward ship position
- Glow color: purple → yellow → pink by phase

---

### Boss 2 — "The Summoner" (🤖)
*New boss*

- Moves in sine wave: `x += vx`, `y = 80 + sin(frame * 0.04) * 30`
- Every 180 frames (3 sec): spawns 1 row of 5 normal aliens at Y=160
- Every 90 frames: fires 2 bullets aimed at ship
- **Shield phase:** at HP 60% and 30%, becomes invincible for 3 seconds (cyan glow, shield emoji overlay), then vulnerable again
- Visual: green glow `#39ff14`, summoning flash effect when spawning minions

---

### Boss 3 — "The Sniper" (💀)
*New boss*

- Stays at Y=70, moves in sudden bursts: every 45 frames teleport-steps 80px left or right (instant, no slide)
- Every 35 frames: fires 1 bullet aimed precisely at ship's current X
- **Charge shot** every 300 frames:
  1. `chargeWarning = true` for 90 frames (boss flashes red, stops shooting)
  2. Then fires 8 bullets evenly spaced in a circle
- Visual: red/dark glow, targeting reticle drawn at ship X when charging
- Glow color: red, phase 3 adds white flash

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/games/space/audio.ts` | CREATE — Web Audio factory |
| `src/games/space/config.ts` | MODIFY — new power-ups, bullet speeds |
| `src/app/games/space/page.tsx` | MODIFY — all game logic + rendering |
