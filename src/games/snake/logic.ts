import {
  GRID_SIZE, LEVELS, POWER_UPS, POWER_UP_SPAWN_CHANCE, POWER_UP_LIFETIME_MS,
  BOMB_SCORE_THRESHOLD, BOMB_SPAWN_CHANCE, BOMB_LIFETIME_MS,
} from "./config";
import type { PowerUpType } from "./config";

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type GameStatus = "idle" | "playing" | "dead";

export interface Position { x: number; y: number; }

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAt: number | null;
  scoreDoubleRemaining: number;
}

export interface SpawnedPowerUp {
  pos: Position;
  type: PowerUpType;
  expiresAt: number;
}

export interface BombState {
  pos: Position;
  spawnedAt: number;
}

export interface SnakeState {
  snake: Position[];
  direction: Direction;
  pendingDir: Direction;
  food: Position;
  spawnedPowerUp: SpawnedPowerUp | null;
  activePowerUp: ActivePowerUp | null;
  bomb: BombState | null;     // NEW
  score: number;
  level: number;
  status: GameStatus;
}

export type SnakeAction =
  | { type: "START" }
  | { type: "RESET" }
  | { type: "SET_DIR"; dir: Direction }
  | { type: "TICK"; now: number }
  | { type: "EXPIRE_POWERUP" };

function randomPos(exclude: Position[]): Position {
  const excludeSet = new Set(exclude.map((p) => `${p.x},${p.y}`));
  let pos: Position;
  do {
    pos = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (excludeSet.has(`${pos.x},${pos.y}`));
  return pos;
}

function posEq(a: Position, b: Position) {
  return a.x === b.x && a.y === b.y;
}

function isOpposite(a: Direction, b: Direction) {
  return (a === "UP" && b === "DOWN") || (a === "DOWN" && b === "UP") ||
    (a === "LEFT" && b === "RIGHT") || (a === "RIGHT" && b === "LEFT");
}

function initialState(): SnakeState {
  const snake = [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 },
  ];
  return {
    snake,
    direction: "RIGHT",
    pendingDir: "RIGHT",
    food: randomPos(snake),
    spawnedPowerUp: null,
    activePowerUp: null,
    bomb: null,                // NEW
    score: 0,
    level: 0,
    status: "idle",
  };
}

export function snakeReducer(state: SnakeState, action: SnakeAction): SnakeState {
  switch (action.type) {
    case "START":
      return { ...initialState(), status: "playing" };

    case "RESET":
      return initialState();

    case "SET_DIR": {
      if (isOpposite(action.dir, state.direction)) return state;
      return { ...state, pendingDir: action.dir };
    }

    case "EXPIRE_POWERUP":
      return { ...state, activePowerUp: null };

    case "TICK": {
      if (state.status !== "playing") return state;

      const dir = state.pendingDir;
      const head = state.snake[0];
      const isGhost = state.activePowerUp?.type === "ghost";

      let nx = head.x + (dir === "RIGHT" ? 1 : dir === "LEFT" ? -1 : 0);
      let ny = head.y + (dir === "DOWN"  ? 1 : dir === "UP"   ? -1 : 0);

      if (isGhost) {
        nx = (nx + GRID_SIZE) % GRID_SIZE;
        ny = (ny + GRID_SIZE) % GRID_SIZE;
      } else {
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) {
          return { ...state, status: "dead" };
        }
      }

      const newHead = { x: nx, y: ny };

      // Self collision
      if (!isGhost && state.snake.some((s) => posEq(s, newHead))) {
        return { ...state, status: "dead" };
      }

      // Bomb collision — instant death
      if (state.bomb && posEq(newHead, state.bomb.pos)) {
        return { ...state, status: "dead" };
      }

      const ateFood = posEq(newHead, state.food);
      const ateMultiplier = state.activePowerUp?.type === "scoreDouble" ? 2 : 1;

      let newSnake = [newHead, ...state.snake];
      if (!ateFood) newSnake = newSnake.slice(0, -1);

      let newScore = state.score;
      let newActivePowerUp = state.activePowerUp;
      let newSpawned = state.spawnedPowerUp;
      let newBomb = state.bomb;

      // Expire spawned power-up if timed out
      if (newSpawned && action.now > newSpawned.expiresAt) {
        newSpawned = null;
      }

      // Expire bomb if timed out
      if (newBomb && action.now > newBomb.spawnedAt + BOMB_LIFETIME_MS) {
        newBomb = null;
      }

      if (ateFood) {
        newScore += 1 * ateMultiplier;

        if (newActivePowerUp?.type === "scoreDouble") {
          const remaining = newActivePowerUp.scoreDoubleRemaining - 1;
          newActivePowerUp = remaining <= 0 ? null : { ...newActivePowerUp, scoreDoubleRemaining: remaining };
        }

        // Spawn power-up
        if (!newSpawned && Math.random() < POWER_UP_SPAWN_CHANCE) {
          const def = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
          newSpawned = {
            pos: randomPos([...newSnake, state.food]),
            type: def.type,
            expiresAt: action.now + POWER_UP_LIFETIME_MS,
          };
        }

        // Spawn bomb (independent of power-up)
        if (
          !newBomb &&
          newScore >= BOMB_SCORE_THRESHOLD &&
          Math.random() < BOMB_SPAWN_CHANCE
        ) {
          const excludePositions = [
            ...newSnake,
            state.food,
            ...(newSpawned ? [newSpawned.pos] : []),
          ];
          newBomb = {
            pos: randomPos(excludePositions),
            spawnedAt: action.now,
          };
        }
      }

      // Power-up pickup
      if (newSpawned && posEq(newHead, newSpawned.pos)) {
        const def = POWER_UPS.find((p) => p.type === newSpawned!.type)!;
        newActivePowerUp = {
          type: def.type,
          expiresAt: def.duration ? action.now + def.duration : null,
          scoreDoubleRemaining: def.scoreDoubleCount ?? 0,
        };
        newSpawned = null;
      }

      // Expire timed power-up
      if (newActivePowerUp?.expiresAt && action.now > newActivePowerUp.expiresAt) {
        newActivePowerUp = null;
      }

      const newLevel = LEVELS.findIndex((l, i) =>
        newScore >= l.minScore && (i === LEVELS.length - 1 || newScore < LEVELS[i + 1].minScore)
      );

      return {
        ...state,
        snake: newSnake,
        direction: dir,
        food: ateFood ? randomPos([...newSnake]) : state.food,
        spawnedPowerUp: newSpawned,
        activePowerUp: newActivePowerUp,
        bomb: newBomb,
        score: newScore,
        level: Math.max(0, newLevel),
        status: "playing",
      };
    }

    default:
      return state;
  }
}
