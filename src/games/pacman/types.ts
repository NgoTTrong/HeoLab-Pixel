export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type GameStatus = "idle" | "playing" | "won" | "dead";
export type GhostMode = "scatter" | "chase" | "frightened" | "eaten";
export type GhostName = "blinky" | "pinky" | "inky" | "clyde";
export type CellType = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0=path, 1=wall, 2=dot, 3=power-pellet, 4=ghost-house, 5=tunnel, 6=ghost-gate

export interface Position {
  x: number;
  y: number;
}

export interface Ghost {
  name: GhostName;
  pos: Position;
  dir: Direction;
  mode: GhostMode;
  scatterTarget: Position;
  color: string;
  frightenedTimer: number;
  eatenReturning: boolean;
  homePos: Position;
  released: boolean;
}

export interface PacmanState {
  maze: CellType[][];
  pacman: Position;
  pacDir: Direction;
  pendingDir: Direction;
  ghosts: Ghost[];
  score: number;
  level: number;
  lives: number;
  status: GameStatus;
  dotsLeft: number;
  ghostCombo: number;
  frightenedTimeLeft: number;
  modeTimer: number;
  modeIndex: number;
  fruitActive: boolean;
  fruitTimer: number;
  tick: number;
}

export interface GameModifiers {
  ghostSpeed: "slow" | "normal" | "fast" | "insane";
  powerDuration: 3 | 5 | 8 | 12;
  mazeStyle: "classic" | "open" | "tight";
  ghostCount: 1 | 2 | 3 | 4;
  bonusFrequency: "off" | "rare" | "normal" | "frequent";
  lives: 1 | 3 | 5 | 99;
  speedRamp: "off" | "gradual" | "aggressive";
}

export type PacmanAction =
  | { type: "START"; modifiers: GameModifiers }
  | { type: "RESET" }
  | { type: "SET_DIR"; dir: Direction }
  | { type: "TICK" }
  | { type: "NEXT_LEVEL" };
