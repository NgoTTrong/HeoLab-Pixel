import type {
  PacmanState,
  PacmanAction,
  GameModifiers,
  Ghost,
  Direction,
  Position,
  CellType,
  GhostName,
} from "./types";
import { getMaze } from "./mazes";
import {
  getGhostTarget,
  chooseDirection,
  chooseFrightenedDirection,
  moveGhost,
  isWalkable,
} from "./ghost-ai";
import {
  SCATTER_CHASE_CYCLE,
  SCORE,
  GHOST_COLORS,
  DEFAULT_MODIFIERS,
  GHOST_SPEED_MULT,
  TICK_MS,
  FOG_RADIUS,
} from "./config";

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

const DIR_VECTORS: Record<Direction, Position> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const MAZE_WIDTH = 28;

// Pac-Man default start position (below ghost house T-junction)
const PACMAN_START: Position = { x: 14, y: 21 };

// Ghost house centre (for returning eaten ghosts)
const GHOST_HOUSE_CENTER: Position = { x: 13, y: 14 };

// Ghost starting positions inside the house
const GHOST_HOME_POSITIONS: Record<GhostName, Position> = {
  blinky: { x: 13, y: 11 }, // starts outside the house, above gate
  pinky: { x: 13, y: 14 },
  inky: { x: 11, y: 14 },
  clyde: { x: 15, y: 14 },
};

// Scatter corner targets
const SCATTER_TARGETS: Record<GhostName, Position> = {
  blinky: { x: 25, y: 0 },
  pinky: { x: 2, y: 0 },
  inky: { x: 27, y: 30 },
  clyde: { x: 0, y: 30 },
};

// Ghost release dot-count thresholds
const GHOST_RELEASE_DOTS: Record<GhostName, number> = {
  blinky: 0,
  pinky: 0, // released after a few ticks (handled by tick threshold)
  inky: 30,
  clyde: 60,
};

// Pinky releases after this many ticks (simulates short delay)
const PINKY_RELEASE_TICK = 5;

// Fruit spawn config
const FRUIT_SPAWN_DOTS = 70; // spawn fruit after this many dots eaten
const FRUIT_DURATION_TICKS = 80; // fruit disappears after this many ticks

// ---------------------------------------------------------------------------
// Ghost creation
// ---------------------------------------------------------------------------

const GHOST_ORDER: GhostName[] = ["blinky", "pinky", "inky", "clyde"];

function createGhosts(count: number, maze: CellType[][]): Ghost[] {
  const ghosts: Ghost[] = [];
  const actual = Math.min(count, 4) as 1 | 2 | 3 | 4;

  for (let i = 0; i < actual; i++) {
    const name = GHOST_ORDER[i];
    ghosts.push({
      name,
      pos: { ...GHOST_HOME_POSITIONS[name] },
      dir: name === "blinky" ? "LEFT" : "UP",
      mode: "scatter",
      scatterTarget: SCATTER_TARGETS[name],
      color: GHOST_COLORS[name],
      frightenedTimer: 0,
      eatenReturning: false,
      homePos: { ...GHOST_HOME_POSITIONS[name] },
      released: name === "blinky", // only blinky starts released
    });
  }

  return ghosts;
}

// ---------------------------------------------------------------------------
// Count collectibles
// ---------------------------------------------------------------------------

function countDots(maze: CellType[][]): number {
  let count = 0;
  for (const row of maze) {
    for (const cell of row) {
      if (cell === 2 || cell === 3) count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function createInitialState(
  modifiers: GameModifiers = DEFAULT_MODIFIERS,
): PacmanState {
  const maze = getMaze(modifiers.mazeStyle);
  return {
    maze,
    pacman: { ...PACMAN_START },
    pacDir: "LEFT",
    pendingDir: "LEFT",
    ghosts: createGhosts(modifiers.ghostCount, maze),
    score: 0,
    level: 1,
    lives: modifiers.lives,
    status: "idle",
    dotsLeft: countDots(maze),
    ghostCombo: 0,
    frightenedTimeLeft: 0,
    modeTimer: 0,
    modeIndex: 0,
    fruitActive: false,
    fruitTimer: 0,
    tick: 0,
    modifiers,

    // Survival mode state
    visited: Array.from({ length: 31 }, () => Array(28).fill(false)),
    visRadius: FOG_RADIUS,
    combo: 0,
    comboTimer: 0,
    comboEffects: { speedBoost: 0, visionBoost: 0, miniPower: 0 },
    turnHistory: {},
    evolutionTier: "basic" as const,
    lastMilestone: 0,
    milestonePopup: null,
    milestonePopupTimer: 0,
    pacMoved: false,
  };
}

// ---------------------------------------------------------------------------
// Pac-Man movement
// ---------------------------------------------------------------------------

function wrapX(x: number): number {
  return ((x % MAZE_WIDTH) + MAZE_WIDTH) % MAZE_WIDTH;
}

function movePacman(state: PacmanState): PacmanState {
  let { pacman, pacDir, pendingDir, maze, score, dotsLeft, ghostCombo } = state;
  let { frightenedTimeLeft, fruitActive, fruitTimer, status } = state;
  let ghosts = state.ghosts;
  const { modifiers, tick, level } = state;

  // 1. Try to switch to pending direction
  if (pendingDir !== pacDir) {
    const vec = DIR_VECTORS[pendingDir];
    const nx = wrapX(pacman.x + vec.x);
    const ny = pacman.y + vec.y;
    if (isWalkable(nx, ny, maze, false, false)) {
      pacDir = pendingDir;
    }
  }

  // 2. Move one tile in current direction
  const vec = DIR_VECTORS[pacDir];
  const nx = wrapX(pacman.x + vec.x);
  const ny = pacman.y + vec.y;

  if (isWalkable(nx, ny, maze, false, false)) {
    pacman = { x: nx, y: ny };
  }

  // 3. Handle tile contents
  const cell = maze[pacman.y][pacman.x];

  if (cell === 2) {
    // Dot
    maze = maze.map((row, ry) =>
      ry === pacman.y
        ? row.map((c, cx) => (cx === pacman.x ? (0 as CellType) : c))
        : row,
    );
    score += SCORE.dot;
    dotsLeft--;
  } else if (cell === 3) {
    // Power pellet
    maze = maze.map((row, ry) =>
      ry === pacman.y
        ? row.map((c, cx) => (cx === pacman.x ? (0 as CellType) : c))
        : row,
    );
    score += SCORE.powerPellet;
    dotsLeft--;
    ghostCombo = 0;

    // Frighten all non-eaten ghosts
    const ticksPerSecond = 1000 / TICK_MS;
    frightenedTimeLeft = Math.round(modifiers.powerDuration * ticksPerSecond);

    ghosts = ghosts.map((g) => {
      if (g.mode === "eaten" || g.eatenReturning) return g;
      return { ...g, mode: "frightened" as const, frightenedTimer: frightenedTimeLeft };
    });
  }

  // 4. Check win
  if (dotsLeft === 0) {
    status = "won";
  }

  // 5. Handle fruit spawning
  const totalDots = countDots(getMaze(modifiers.mazeStyle));
  const dotsEaten = totalDots - dotsLeft;

  if (
    !fruitActive &&
    modifiers.bonusFrequency !== "off" &&
    dotsEaten >= FRUIT_SPAWN_DOTS &&
    fruitTimer === 0
  ) {
    fruitActive = true;
    fruitTimer = FRUIT_DURATION_TICKS;
  }

  // 6. Fruit collection (fruit spawns at row 17, col 13 — below ghost house)
  if (fruitActive && pacman.x === 13 && pacman.y === 17) {
    const fruitIndex = Math.min(level - 1, SCORE.fruit.length - 1);
    score += SCORE.fruit[fruitIndex];
    fruitActive = false;
    fruitTimer = 0;
  }

  // 7. Fruit timer countdown
  if (fruitActive) {
    fruitTimer--;
    if (fruitTimer <= 0) {
      fruitActive = false;
      fruitTimer = 0;
    }
  }

  return {
    ...state,
    pacman,
    pacDir,
    pendingDir,
    maze,
    score,
    dotsLeft,
    ghostCombo,
    frightenedTimeLeft,
    ghosts,
    fruitActive,
    fruitTimer,
    status,
  };
}

// ---------------------------------------------------------------------------
// Ghost updates
// ---------------------------------------------------------------------------

function updateGhosts(state: PacmanState): PacmanState {
  const { modifiers, tick, pacman, pacDir } = state;
  let { modeTimer, modeIndex, frightenedTimeLeft } = state;

  // Determine the base ghost mode from scatter/chase cycle
  const cycle = SCATTER_CHASE_CYCLE[Math.min(modeIndex, SCATTER_CHASE_CYCLE.length - 1)];
  const isScatterPhase = modeTimer < cycle[0];

  // Update mode timer
  modeTimer++;
  if (modeTimer >= cycle[0] + cycle[1]) {
    modeTimer = 0;
    modeIndex = Math.min(modeIndex + 1, SCATTER_CHASE_CYCLE.length - 1);
  }

  // Decrement frightened timer globally
  if (frightenedTimeLeft > 0) {
    frightenedTimeLeft--;
  }

  // Speed: determine if this ghost should skip this tick (for slower/faster movement)
  const speedMult = GHOST_SPEED_MULT[modifiers.ghostSpeed] ?? 1;
  // Level-based speed increase
  let levelSpeedBoost = 0;
  if (modifiers.speedRamp === "gradual") {
    levelSpeedBoost = (state.level - 1) * 0.05;
  } else if (modifiers.speedRamp === "aggressive") {
    levelSpeedBoost = (state.level - 1) * 0.1;
  }
  const effectiveSpeed = Math.max(0.3, speedMult - levelSpeedBoost);

  // Ghost skips tick based on effective speed multiplier
  // effectiveSpeed=1 means move every tick, 1.5 means skip every 3rd tick, 0.5 means move every tick
  const shouldMoveGhost = (ghost: Ghost, _idx: number): boolean => {
    if (effectiveSpeed <= 1) return true;
    // Skip some ticks for slower speeds
    return tick % Math.round(effectiveSpeed) === 0;
  };

  // Find blinky reference (for inky's targeting)
  const blinky = state.ghosts.find((g) => g.name === "blinky") ?? state.ghosts[0];

  // Count dots eaten for release thresholds
  const totalDots = countDots(getMaze(modifiers.mazeStyle));
  const dotsEaten = totalDots - state.dotsLeft;

  const updatedGhosts = state.ghosts.map((ghost, idx) => {
    let g = { ...ghost };

    // 1. Release check for unreleased ghosts
    if (!g.released) {
      const threshold = GHOST_RELEASE_DOTS[g.name];
      if (g.name === "pinky" && tick >= PINKY_RELEASE_TICK) {
        g.released = true;
      } else if (dotsEaten >= threshold && g.name !== "pinky") {
        g.released = true;
      }

      if (!g.released) return g;

      // Just released: move to ghost gate position to exit
      g.pos = { x: 13, y: 12 };
      g.dir = "UP";
    }

    // 2. Handle eaten ghosts returning to house
    if (g.eatenReturning) {
      // Move toward ghost house
      const target = GHOST_HOUSE_CENTER;
      g.dir = chooseDirection(g, target, state.maze);
      const newPos = moveGhost(g, state.maze);
      g.pos = newPos;

      // Check if arrived at ghost house
      if (g.pos.x === GHOST_HOUSE_CENTER.x && g.pos.y === GHOST_HOUSE_CENTER.y) {
        g.eatenReturning = false;
        g.mode = isScatterPhase ? "scatter" : "chase";
        g.pos = { ...g.homePos };
        g.dir = "UP";
      }
      return g;
    }

    // 3. Skip tick for speed control
    if (!shouldMoveGhost(g, idx)) return g;

    // 4. Update mode (unless frightened)
    if (g.mode === "frightened") {
      if (frightenedTimeLeft <= 0) {
        g.mode = isScatterPhase ? "scatter" : "chase";
        g.frightenedTimer = 0;
      } else {
        g.frightenedTimer = frightenedTimeLeft;
      }
    } else if (g.mode !== "eaten") {
      g.mode = isScatterPhase ? "scatter" : "chase";
    }

    // 5. Choose direction based on mode
    if (g.mode === "frightened") {
      g.dir = chooseFrightenedDirection(g, state.maze);
    } else {
      const target = getGhostTarget(g, pacman, pacDir, blinky);
      g.dir = chooseDirection(g, target, state.maze);
    }

    // 6. Move ghost
    g.pos = moveGhost(g, state.maze);

    return g;
  });

  return {
    ...state,
    ghosts: updatedGhosts,
    modeTimer,
    modeIndex,
    frightenedTimeLeft,
  };
}

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

function checkCollisions(state: PacmanState): PacmanState {
  const { pacman } = state;
  let { score, lives, ghostCombo, status } = state;
  let ghosts = [...state.ghosts];
  let needReset = false;

  for (let i = 0; i < ghosts.length; i++) {
    const ghost = ghosts[i];

    if (ghost.pos.x !== pacman.x || ghost.pos.y !== pacman.y) continue;

    if (ghost.eatenReturning) {
      // Eaten ghosts don't collide
      continue;
    }

    if (ghost.mode === "frightened") {
      // Eat the ghost
      const comboIdx = Math.min(ghostCombo, SCORE.ghost.length - 1);
      score += SCORE.ghost[comboIdx];
      ghostCombo++;

      ghosts[i] = {
        ...ghost,
        mode: "eaten",
        eatenReturning: true,
        frightenedTimer: 0,
      };
    } else if (ghost.mode === "chase" || ghost.mode === "scatter") {
      // Pac-Man dies
      lives--;
      if (lives <= 0) {
        status = "dead";
      } else {
        needReset = true;
      }
      break; // Only process one death per tick
    }
  }

  // Reset positions after losing a life (but not game over)
  if (needReset && status !== "dead") {
    const resetGhosts = createGhosts(state.modifiers.ghostCount, state.maze);
    return {
      ...state,
      score,
      lives,
      ghostCombo: 0,
      status,
      ghosts: resetGhosts,
      pacman: { ...PACMAN_START },
      pacDir: "LEFT",
      pendingDir: "LEFT",
      frightenedTimeLeft: 0,
      modeTimer: 0,
      modeIndex: 0,
    };
  }

  return { ...state, score, lives, ghostCombo, status, ghosts };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function pacmanReducer(
  state: PacmanState,
  action: PacmanAction,
): PacmanState {
  switch (action.type) {
    case "START": {
      return { ...createInitialState(action.modifiers), status: "playing" };
    }

    case "RESET": {
      return createInitialState(state.modifiers);
    }

    case "SET_DIR": {
      if (state.status !== "playing") return state;
      return { ...state, pendingDir: action.dir };
    }

    case "TICK": {
      if (state.status !== "playing") return state;
      let s = movePacman(state);
      if (s.status !== "playing") return { ...s, tick: s.tick + 1 };
      s = updateGhosts(s);
      s = checkCollisions(s);
      return { ...s, tick: s.tick + 1 };
    }

    case "NEXT_LEVEL": {
      const nextLevel = state.level + 1;
      const maze = getMaze(state.modifiers.mazeStyle);
      const ghosts = createGhosts(state.modifiers.ghostCount, maze);

      return {
        ...state,
        maze,
        pacman: { ...PACMAN_START },
        pacDir: "LEFT",
        pendingDir: "LEFT",
        ghosts,
        level: nextLevel,
        dotsLeft: countDots(maze),
        ghostCombo: 0,
        frightenedTimeLeft: 0,
        modeTimer: 0,
        modeIndex: 0,
        fruitActive: false,
        fruitTimer: 0,
        tick: 0,
        status: "playing",
      };
    }

    default:
      return state;
  }
}
