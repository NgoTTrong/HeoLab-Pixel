// src/games/drift/logic.ts

import type {
  GameState,
  GameAction,
  GameMode,
  PlayerState,
  AIDriver,
  Segment,
  PowerUpInstance,
  PowerUpType,
} from "./types";

import {
  CARS,
  TRACKS,
  TOTAL_LAPS,
  BASE_MAX_SPEED,
  SPEED_PER_RATING,
  ACCEL_RATE,
  BRAKE_RATE,
  OFFROAD_SLOW,
  CURVE_SPEED_LOSS,
  DRIFT_CHARGE_RATE,
  DRIFT_LEVEL_THRESHOLDS,
  DRIFT_BOOST_MULTIPLIERS,
  DRIFT_BOOST_DURATIONS,
  DRIFT_STEER_FACTOR,
  DRIFT_LATERAL_SPEED,
  DRIFT_SCORE_PER_SECOND,
  SPIN_OUT_DURATION,
  AI_COLLISION_RADIUS,
  AI_COUNT,
  AI_BASE_SPEED_RATIOS,
  AI_RUBBER_BAND_CAPS,
  AI_START_Z_OFFSETS,
  AI_STEER_SMOOTHNESS,
  POWERUP_SPAWN_INTERVAL,
  POSITION_SCORES,
} from "./config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSegments(trackIndex: number): Segment[] {
  const track = TRACKS[trackIndex];
  const raw = track.build();
  return raw.map((s, i) => ({
    index: i,
    z: i, // segment index is the z position
    curve: s.curve,
    hill: s.hill,
    screen: { x: 0, y: 0, w: 0, scale: 0 },
  }));
}

function createPlayer(): PlayerState {
  return {
    x: 0,
    speed: 0,
    z: 0,
    spriteAngle: 0,
    drift: { active: false, direction: 0, chargeMs: 0, level: 0 },
    boost: { active: false, remainingMs: 0, multiplier: 1 },
    powerUp: null,
    shieldMs: 0,
    magnetMs: 0,
    spinOut: false,
    spinOutMs: 0,
  };
}

function createAIDrivers(segments: Segment[], playerCarIndex: number): AIDriver[] {
  const availableCars = CARS.map((_, i) => i).filter((i) => i !== playerCarIndex);
  return Array.from({ length: AI_COUNT }, (_, tier) => ({
    x: (tier - 1) * 0.4,
    speed: BASE_MAX_SPEED * AI_BASE_SPEED_RATIOS[tier],
    z: AI_START_Z_OFFSETS[tier],
    carIndex: availableCars[tier % availableCars.length],
    targetSpeed: BASE_MAX_SPEED * AI_BASE_SPEED_RATIOS[tier],
  }));
}

function spawnPowerUps(segments: Segment[]): PowerUpInstance[] {
  const types: PowerUpType[] = ["nitro", "shield", "oil", "magnet"];
  const items: PowerUpInstance[] = [];
  for (
    let i = POWERUP_SPAWN_INTERVAL;
    i < segments.length;
    i += POWERUP_SPAWN_INTERVAL
  ) {
    items.push({
      type: types[Math.floor(Math.random() * types.length)],
      segmentIndex: i,
      lane: (Math.random() - 0.5) * 1.6, // -0.8 to 0.8
      collected: false,
    });
  }
  return items;
}

function getDriftLevel(chargeMs: number): number {
  // levels: 0 (no drift), 1, 2, 3
  if (chargeMs >= DRIFT_LEVEL_THRESHOLDS[2]) return 3;
  if (chargeMs >= DRIFT_LEVEL_THRESHOLDS[1]) return 2;
  if (chargeMs >= DRIFT_LEVEL_THRESHOLDS[0]) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// initialState
// ---------------------------------------------------------------------------

export function initialState(
  mode: GameMode,
  trackIndex: number,
  carIndex: number,
  bestTime: number | null,
  ghostZ: number[] = [],
): GameState {
  const segments = buildSegments(trackIndex);
  const player = createPlayer();
  const ai = mode === "race" ? createAIDrivers(segments, carIndex) : [];
  const powerUps = mode === "race" ? spawnPowerUps(segments) : [];

  return {
    status: "countdown",
    mode,
    trackIndex,
    carIndex,
    segments,
    player,
    ai,
    lap: 1,
    totalLaps: TOTAL_LAPS,
    position: mode === "race" ? AI_COUNT + 1 : 1, // start last
    elapsedMs: 0,
    lapTimes: [],
    bestTime,
    ghostZ,
    powerUps,
    oilSlicks: [],
    countdown: 3,
    driftScore: 0,
    score: 0,
    ghostRecording: [],
    steerDir: 0,
    accelPressed: false,
    brakePressed: false,
    lastSteerDir: 0,
  };
}

// ---------------------------------------------------------------------------
// Tick sub-functions (all return a new state via shallow copies)
// ---------------------------------------------------------------------------

function tickPlayer(state: GameState, dt: number): GameState {
  const car = CARS[state.carIndex];
  const maxSpeed = BASE_MAX_SPEED + (car.speed - 3) * SPEED_PER_RATING;
  const player = { ...state.player };
  const segments = state.segments;

  // Acceleration
  if (state.accelPressed && !player.spinOut) {
    player.speed = Math.min(
      maxSpeed,
      player.speed + maxSpeed * ACCEL_RATE * (dt / 1000),
    );
  }
  if (state.brakePressed) {
    player.speed = Math.max(
      0,
      player.speed - maxSpeed * BRAKE_RATE * (dt / 1000),
    );
  }

  // Natural deceleration
  player.speed *= 1 - 0.1 * (dt / 1000);

  // Steering
  const steerAmount =
    state.steerDir * (car.handling / 3) * 0.003 * dt;
  if (player.drift.active) {
    player.x += steerAmount * DRIFT_STEER_FACTOR;
    player.x +=
      player.drift.direction * DRIFT_LATERAL_SPEED * player.speed * dt;
  } else {
    player.x += steerAmount;
  }

  // Clamp to road bounds
  player.x = Math.max(-1.2, Math.min(1.2, player.x));

  // Offroad penalty
  if (Math.abs(player.x) > 1.0) {
    player.speed *= OFFROAD_SLOW;
  }

  // Curve speed loss (reduced while drifting)
  const segIndex = Math.floor(player.z) % segments.length;
  const currentSeg = segments[segIndex >= 0 ? segIndex : 0];
  const curveFactor = Math.abs(currentSeg.curve) * CURVE_SPEED_LOSS;
  player.speed *=
    1 - curveFactor * (player.drift.active ? 0.2 : 1) * (dt / 1000);

  // Boost multiplier
  if (player.boost.active) {
    player.speed = Math.min(
      maxSpeed * player.boost.multiplier,
      player.speed * player.boost.multiplier,
    );
  }

  // Move forward
  player.z += (player.speed * dt) / 1000;

  // Sprite angle for visual
  player.spriteAngle = player.drift.active
    ? Math.sign(player.drift.direction) *
      Math.min(3, 1 + player.drift.chargeMs / 1500)
    : state.steerDir *
      Math.min(2, player.speed / (maxSpeed * 0.5));

  // Spin-out countdown
  if (player.spinOut) {
    player.spinOutMs -= dt;
    if (player.spinOutMs <= 0) {
      player.spinOut = false;
      player.spinOutMs = 0;
    }
    player.speed *= 0.95; // rapid deceleration during spin
  }

  return { ...state, player };
}

function tickDrift(state: GameState, dt: number): GameState {
  const player = { ...state.player };
  const drift = { ...player.drift };
  let { driftScore } = state;

  if (drift.active) {
    drift.chargeMs += DRIFT_CHARGE_RATE * dt;
    drift.level = getDriftLevel(drift.chargeMs);
    driftScore += DRIFT_SCORE_PER_SECOND * (dt / 1000);
  }

  player.drift = drift;
  return { ...state, player, driftScore };
}

function tickBoost(state: GameState, dt: number): GameState {
  const player = { ...state.player };
  const boost = { ...player.boost };

  if (boost.active) {
    boost.remainingMs -= dt;
    if (boost.remainingMs <= 0) {
      boost.active = false;
      boost.remainingMs = 0;
      boost.multiplier = 1;
    }
  }

  player.boost = boost;
  return { ...state, player };
}

function tickAI(state: GameState, dt: number): GameState {
  if (state.ai.length === 0) return state;
  const segments = state.segments;
  const player = state.player;

  const ai = state.ai.map((driver, tier) => {
    const d = { ...driver };
    const baseSpeed = BASE_MAX_SPEED * AI_BASE_SPEED_RATIOS[tier];
    const capSpeed  = BASE_MAX_SPEED * AI_RUBBER_BAND_CAPS[tier];

    // Rubber band: close the gap to player
    const gap = player.z - d.z;
    if (gap > 20) {
      d.targetSpeed = Math.min(capSpeed, baseSpeed + gap * 0.3);
    } else if (gap < 5) {
      d.targetSpeed = Math.max(baseSpeed * 0.8, d.targetSpeed - 5);
    } else {
      d.targetSpeed = baseSpeed;
    }
    d.speed += (d.targetSpeed - d.speed) * 0.04;

    // Steer toward racing line
    const segIdx = ((Math.floor(d.z) % segments.length) + segments.length) % segments.length;
    const seg = segments[segIdx];
    const targetX = -seg.curve * 0.5;
    d.x += (targetX - d.x) * AI_STEER_SMOOTHNESS;
    d.x = Math.max(-0.9, Math.min(0.9, d.x));

    // Move forward
    d.z += (d.speed * dt) / 1000;

    return d;
  });

  return { ...state, ai };
}

function checkCollisions(state: GameState): GameState {
  const car = CARS[state.carIndex];
  const maxSpeed = BASE_MAX_SPEED + (car.speed - 3) * SPEED_PER_RATING;
  const player = { ...state.player };

  // Already spinning - skip
  if (player.spinOut) return { ...state, player };

  // Barrier collision
  if (
    Math.abs(player.x) > 1.1 &&
    player.speed > maxSpeed * 0.3
  ) {
    if (player.shieldMs > 0) {
      player.shieldMs = 0;
    } else {
      player.spinOut = true;
      player.spinOutMs = SPIN_OUT_DURATION;
    }
    return { ...state, player };
  }

  // AI car collision
  for (const ai of state.ai) {
    if (
      Math.abs(player.z - ai.z) < 2 &&
      Math.abs(player.x - ai.x) < AI_COLLISION_RADIUS
    ) {
      if (player.shieldMs > 0) {
        player.shieldMs = 0;
      } else {
        player.spinOut = true;
        player.spinOutMs = SPIN_OUT_DURATION;
      }
      break;
    }
  }

  return { ...state, player };
}

function checkPowerUps(state: GameState): GameState {
  const player = { ...state.player };
  const powerUps = state.powerUps.map((p) => ({ ...p }));
  let changed = false;

  for (const pu of powerUps) {
    if (pu.collected) continue;

    const dz = Math.abs(player.z - pu.segmentIndex);
    const dx = Math.abs(player.x - pu.lane);
    // Magnet extends pickup range
    const pickupRange = player.magnetMs > 0 ? 0.6 : 0.3;

    if (dz < 3 && dx < pickupRange) {
      pu.collected = true;
      changed = true;

      // If player already holds a power-up, replace it
      player.powerUp = pu.type;
    }
  }

  if (!changed) return state;
  return { ...state, player, powerUps };
}

function tickOilSlicks(state: GameState, dt: number): GameState {
  const player = { ...state.player };
  let oilSlicks = state.oilSlicks
    .map((o) => ({ ...o, remainingMs: o.remainingMs - dt }))
    .filter((o) => o.remainingMs > 0);

  // Check if player hits any oil slick
  if (!player.spinOut) {
    for (const oil of oilSlicks) {
      if (
        Math.abs(player.z - oil.segmentIndex) < 2 &&
        Math.abs(player.x - oil.lane) < 0.3
      ) {
        if (player.shieldMs > 0) {
          player.shieldMs = 0;
        } else {
          player.spinOut = true;
          player.spinOutMs = SPIN_OUT_DURATION;
        }
        break;
      }
    }
  }

  return { ...state, player, oilSlicks };
}

function checkLapCompletion(state: GameState): GameState {
  const trackLength = state.segments.length;
  const lapThreshold = trackLength * state.lap;

  if (state.player.z >= lapThreshold) {
    const prevLapTimeSum = state.lapTimes.reduce((a, b) => a + b, 0);
    const newLapTime = state.elapsedMs - prevLapTimeSum;
    const lapTimes = [...state.lapTimes, newLapTime];
    const newLap = state.lap + 1;

    if (newLap > state.totalLaps) {
      // Race finished - compute final score
      let score = state.driftScore;
      if (state.mode === "race") {
        score += POSITION_SCORES[state.position - 1] ?? 0;
      }
      return {
        ...state,
        lap: newLap,
        lapTimes,
        status: "finished",
        score,
      };
    }
    return { ...state, lap: newLap, lapTimes };
  }
  return state;
}

function computePosition(state: GameState): number {
  if (state.mode !== "race") return 1;
  let pos = 1;
  for (const ai of state.ai) {
    if (ai.z > state.player.z) pos++;
  }
  return pos;
}

function tickShieldAndMagnet(state: GameState, dt: number): GameState {
  const player = { ...state.player };
  if (player.shieldMs > 0) {
    player.shieldMs = Math.max(0, player.shieldMs - dt);
  }
  if (player.magnetMs > 0) {
    player.magnetMs = Math.max(0, player.magnetMs - dt);
  }
  return { ...state, player };
}

// ---------------------------------------------------------------------------
// gameReducer
// ---------------------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "INIT":
      return initialState(
        action.mode,
        action.trackIndex,
        action.carIndex,
        action.bestTime,
        action.ghostZ ?? [],
      );

    case "COUNTDOWN_TICK": {
      const next = state.countdown - 1;
      if (next <= 0) {
        return { ...state, countdown: 0, status: "racing" };
      }
      return { ...state, countdown: next };
    }

    case "TICK": {
      if (state.status !== "racing") return state;
      const dt = action.dt;

      let s = state;
      s = tickPlayer(s, dt);
      s = tickDrift(s, dt);
      s = tickBoost(s, dt);
      s = tickShieldAndMagnet(s, dt);
      s = tickAI(s, dt);
      s = checkCollisions(s);
      s = checkPowerUps(s);
      s = tickOilSlicks(s, dt);
      s = checkLapCompletion(s);

      // Update elapsed time, position, ghost recording
      const elapsedMs = s.elapsedMs + dt;
      const position = computePosition(s);
      const ghostRecording = [...s.ghostRecording, s.player.z];

      return { ...s, elapsedMs, position, ghostRecording };
    }

    case "STEER":
      return {
        ...state,
        steerDir: action.direction,
        lastSteerDir: action.direction !== 0 ? action.direction : state.lastSteerDir,
      };

    case "ACCELERATE":
      return { ...state, accelPressed: action.pressed };

    case "BRAKE":
      return { ...state, brakePressed: action.pressed };

    case "DRIFT_START": {
      const car = CARS[state.carIndex];
      const maxSpeed = BASE_MAX_SPEED + (car.speed - 3) * SPEED_PER_RATING;
      if (state.player.speed < maxSpeed * 0.15) return state; // too slow to drift

      const dir = state.steerDir || state.lastSteerDir || 1;
      const player = {
        ...state.player,
        drift: {
          active: true,
          direction: dir,
          chargeMs: state.player.drift.active ? state.player.drift.chargeMs : 0,
          level: state.player.drift.active ? state.player.drift.level : 0,
        },
      };
      return { ...state, player };
    }

    case "DRIFT_END": {
      const { drift } = state.player;
      if (!drift.active) return state;

      // Convert charge to boost based on level
      const level = getDriftLevel(drift.chargeMs);
      const boostIndex = Math.max(0, level - 1); // levels 1,2,3 -> indices 0,1,2

      let boost = state.player.boost;
      if (level >= 1) {
        boost = {
          active: true,
          remainingMs: DRIFT_BOOST_DURATIONS[boostIndex],
          multiplier: DRIFT_BOOST_MULTIPLIERS[boostIndex],
        };
      }

      const player = {
        ...state.player,
        drift: { active: false, direction: 0, chargeMs: 0, level: 0 },
        boost,
      };
      return { ...state, player };
    }

    case "USE_POWERUP": {
      const pu = state.player.powerUp;
      if (!pu) return state;

      const player = { ...state.player, powerUp: null as PowerUpType | null };

      switch (pu) {
        case "nitro":
          player.boost = { active: true, remainingMs: 2500, multiplier: 1.8 };
          break;
        case "shield":
          player.shieldMs = 5000;
          break;
        case "oil": {
          const oilSlicks = [
            ...state.oilSlicks,
            {
              segmentIndex: Math.floor(state.player.z),
              lane: state.player.x,
              remainingMs: 15000,
            },
          ];
          return { ...state, player, oilSlicks };
        }
        case "magnet":
          player.magnetMs = 8000;
          break;
      }

      return { ...state, player };
    }

    case "PAUSE":
      if (state.status === "racing") {
        return { ...state, status: "paused" };
      }
      return state;

    case "RESUME":
      if (state.status === "paused") {
        return { ...state, status: "racing" };
      }
      return state;

    default:
      return state;
  }
}
