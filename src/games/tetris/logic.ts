import {
  BOARD_COLS, BOARD_ROWS, LINE_SCORES, RANDOM_EVENTS, getSpeed,
  COMBO_BONUSES, TSPIN_SCORES, BACK_TO_BACK_MULT,
  OVERDRIVE_SCORE_MULT, OVERDRIVE_DURATION, FEVER_DURATION, FREEZE_DURATION,
  GARBAGE_ROWS_BOMB, GARBAGE_ROWS_CURSE, ZEN_PIECE_WEIGHTS, getZenFlowTier,
} from "./config";
import type { EventType, TSpinKind, GameMode } from "./config";
import { TETROMINOES, createBag, createWeightedBag } from "./tetrominoes";
import type { TetrominoType } from "./tetrominoes";

export type Cell = string | null; // color string or null
export type Board = Cell[][];
export type GameStatus = "idle" | "playing" | "paused" | "over";

export interface ActivePiece {
  type: TetrominoType;
  rotation: number;
  col: number; // pivot column
  row: number; // pivot row
}

export interface TetrisState {
  board: Board;
  active: ActivePiece;
  held: TetrominoType | null;
  canHold: boolean;
  bag: TetrominoType[];
  nextPieces: TetrominoType[]; // next 3
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
  activeEvent: EventType | null;
  eventEndsAt: number | null; // for fever/freeze
  linesUntilEvent: number; // counts down to trigger event
  combo: number;
  lastClearWasTetrisOrTSpin: boolean;
  tSpinType: "none" | TSpinKind;
  overdriveActive: boolean;
  lastWasRotation: boolean;
  lastClearedRows: number[];
  mode: GameMode;
  streak: number;
}

export type TetrisAction =
  | { type: "START"; mode: GameMode }
  | { type: "RESET" }
  | { type: "MOVE_LEFT" }
  | { type: "MOVE_RIGHT" }
  | { type: "MOVE_DOWN" }
  | { type: "HARD_DROP" }
  | { type: "ROTATE" }
  | { type: "HOLD" }
  | { type: "TICK"; now: number }
  | { type: "CLEAR_EVENT" };

function emptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

function getAbsCells(piece: ActivePiece): [number, number][] {
  const def = TETROMINOES[piece.type];
  return def.cells[piece.rotation].map(([dc, dr]) => [piece.col + dc, piece.row + dr]);
}

function isValid(board: Board, piece: ActivePiece): boolean {
  return getAbsCells(piece).every(([c, r]) =>
    c >= 0 && c < BOARD_COLS && r >= 0 && r < BOARD_ROWS && board[r][c] === null
  );
}

function lockPiece(board: Board, piece: ActivePiece): Board {
  const color = TETROMINOES[piece.type].color;
  const newBoard = board.map((row) => [...row]);
  getAbsCells(piece).forEach(([c, r]) => {
    newBoard[r][c] = color;
  });
  return newBoard;
}

function clearLines(board: Board): { board: Board; cleared: number; clearedRows: number[] } {
  const clearedRows: number[] = [];
  board.forEach((row, i) => {
    if (row.every((c) => c !== null)) clearedRows.push(i);
  });
  const remaining = board.filter((row) => row.some((c) => c === null));
  const cleared = BOARD_ROWS - remaining.length;
  const newRows = Array.from({ length: cleared }, () => Array(BOARD_COLS).fill(null));
  return { board: [...newRows, ...remaining], cleared, clearedRows };
}

function ghostRow(board: Board, piece: ActivePiece): number {
  let ghost = { ...piece };
  while (isValid(board, { ...ghost, row: ghost.row + 1 })) ghost.row++;
  return ghost.row;
}

function detectTSpin(
  board: Board,
  piece: ActivePiece,
  wasRotation: boolean
): "none" | TSpinKind {
  if (piece.type !== "T" || !wasRotation) return "none";
  // Check all 4 corners of the T bounding box (3×3 grid)
  const corners: [number, number][] = [
    [piece.col,     piece.row    ],
    [piece.col + 2, piece.row    ],
    [piece.col,     piece.row + 2],
    [piece.col + 2, piece.row + 2],
  ];
  const occupied = corners.filter(([c, r]) =>
    c < 0 || c >= BOARD_COLS || r < 0 || r >= BOARD_ROWS ||
    (board[r] !== undefined && board[r][c] !== null)
  ).length;
  if (occupied < 3) return "none";
  return occupied >= 4 ? "single" : "mini";
}

function spawnPiece(type: TetrominoType): ActivePiece {
  return { type, rotation: 0, col: 3, row: 0 };
}

function drawFromBag(state: TetrisState): { active: ActivePiece; bag: TetrominoType[]; nextPieces: TetrominoType[] } {
  const createBagFn = state.mode === "zen" ? () => createWeightedBag(ZEN_PIECE_WEIGHTS) : createBag;
  let bag = [...state.bag];
  const allPieces = [...state.nextPieces, ...bag];
  if (allPieces.length < 4) bag = [...bag, ...createBagFn()];
  const next = [...state.nextPieces, ...bag];
  const active = spawnPiece(next[0]);
  return { active, bag: next.slice(4), nextPieces: next.slice(1, 4) };
}

function applyEvent(board: Board, event: EventType): Board {
  const newBoard = board.map((row) => [...row]);

  if (event === "lightning") {
    const nonEmpty = newBoard.reduce<number[]>((acc, row, i) => {
      if (row.some((c) => c !== null)) acc.push(i);
      return acc;
    }, []);
    if (nonEmpty.length > 0) {
      const targetRow = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
      newBoard.splice(targetRow, 1);
      newBoard.unshift(Array(BOARD_COLS).fill(null));
    }
  } else if (event === "bomb" || event === "curse") {
    const rows = event === "bomb" ? GARBAGE_ROWS_BOMB : GARBAGE_ROWS_CURSE;
    for (let i = 0; i < rows; i++) {
      const gapCol = Math.floor(Math.random() * BOARD_COLS);
      const garbageRow: (string | null)[] = Array.from(
        { length: BOARD_COLS },
        (_, c) => (c === gapCol ? null : "#444466")
      );
      newBoard.splice(0, 1);
      newBoard.push(garbageRow);
    }
  } else if (event === "whirlwind") {
    for (let r = 0; r < newBoard.length; r++) {
      const shift = Math.floor(Math.random() * 5) - 2; // -2 to +2
      if (shift === 0) continue;
      const row = newBoard[r];
      const shifted: (string | null)[] = Array(BOARD_COLS).fill(null);
      for (let c = 0; c < BOARD_COLS; c++) {
        const newC = ((c + shift) % BOARD_COLS + BOARD_COLS) % BOARD_COLS;
        shifted[newC] = row[c];
      }
      newBoard[r] = shifted;
    }
  }

  return newBoard;
}

function initialState(mode: GameMode = "storm"): TetrisState {
  const createBagFn = mode === "zen" ? () => createWeightedBag(ZEN_PIECE_WEIGHTS) : createBag;
  const bag1 = createBagFn();
  const bag2 = createBagFn();
  const allPieces = [...bag1, ...bag2];
  return {
    board: emptyBoard(),
    active: spawnPiece(allPieces[0]),
    held: null,
    canHold: true,
    bag: allPieces.slice(4),
    nextPieces: allPieces.slice(1, 4),
    score: 0,
    lines: 0,
    level: 1,
    status: "idle",
    activeEvent: null,
    eventEndsAt: null,
    linesUntilEvent: 5,
    combo: 0,
    lastClearWasTetrisOrTSpin: false,
    tSpinType: "none",
    overdriveActive: false,
    lastWasRotation: false,
    lastClearedRows: [],
    mode,
    streak: 0,
  };
}

export function tetrisReducer(state: TetrisState, action: TetrisAction): TetrisState {
  switch (action.type) {
    case "START":
      return { ...initialState(action.mode), status: "playing" };
    case "RESET":
      return initialState(state.mode);

    case "CLEAR_EVENT":
      return { ...state, activeEvent: null, eventEndsAt: null };

    case "MOVE_LEFT": {
      if (state.status !== "playing") return state;
      const moved = { ...state.active, col: state.active.col - 1 };
      return isValid(state.board, moved) ? { ...state, active: moved, lastWasRotation: false } : state;
    }
    case "MOVE_RIGHT": {
      if (state.status !== "playing") return state;
      const moved = { ...state.active, col: state.active.col + 1 };
      return isValid(state.board, moved) ? { ...state, active: moved, lastWasRotation: false } : state;
    }
    case "ROTATE": {
      if (state.status !== "playing") return state;
      const rotated = { ...state.active, rotation: (state.active.rotation + 1) % 4 };
      // Wall kick: try col offsets [0, -1, 1, -2, 2]
      for (const offset of [0, -1, 1, -2, 2]) {
        const kicked = { ...rotated, col: rotated.col + offset };
        if (isValid(state.board, kicked)) return { ...state, active: kicked, lastWasRotation: true };
      }
      return state;
    }
    case "HOLD": {
      if (state.status !== "playing" || !state.canHold) return state;
      const newHeld = state.active.type;
      const { active, bag, nextPieces } = state.held
        ? { active: spawnPiece(state.held), bag: state.bag, nextPieces: state.nextPieces }
        : drawFromBag(state);
      return { ...state, active, held: newHeld, canHold: false, bag, nextPieces, lastWasRotation: false };
    }

    case "MOVE_DOWN":
    case "TICK": {
      if (state.status !== "playing") return state;
      if (state.activeEvent === "freeze" && action.type === "TICK") return state; // freeze pauses auto-drop

      const moved = { ...state.active, row: state.active.row + 1 };
      if (isValid(state.board, moved)) {
        return { ...state, active: moved, lastWasRotation: false };
      }

      // Lock piece
      let board = lockPiece(state.board, state.active);
      const { board: clearedBoard, cleared, clearedRows } = clearLines(board);
      board = clearedBoard;

      // T-spin detection (runs against pre-clear board)
      const tSpinType = detectTSpin(state.board, state.active, state.lastWasRotation);

      // Event trigger variables (hoisted so scoring can read overdriveActive)
      let linesUntilEvent = state.linesUntilEvent - cleared;
      let activeEvent = state.activeEvent;
      let eventEndsAt = state.eventEndsAt;
      let overdriveActive = state.overdriveActive;

      // --- Scoring ---
      const isFever     = state.activeEvent === "fever";
      const isOverdrive = overdriveActive;

      // Base score: T-spin takes priority over line score
      let baseScore = 0;
      if (tSpinType !== "none" && cleared > 0) {
        const kindKey =
          cleared === 1 ? (tSpinType === "mini" ? "mini" : "single")
          : cleared === 2 ? "double"
          : "triple";
        baseScore = TSPIN_SCORES[kindKey as TSpinKind];
      } else {
        baseScore = LINE_SCORES[Math.min(cleared, 4)];
      }

      // Back-to-back bonus (Tetris or T-spin after Tetris or T-spin)
      const isTetrisOrTSpin = cleared === 4 || tSpinType !== "none";
      const b2bMult = (state.lastClearWasTetrisOrTSpin && isTetrisOrTSpin && cleared > 0)
        ? BACK_TO_BACK_MULT : 1;

      // Combo (declared early so Zen Flow tier can read newCombo)
      const newCombo   = cleared > 0 ? state.combo + 1 : 0;
      const newStreak  = cleared > 0 ? state.streak + 1 : 0;

      // Fever + Overdrive + Zen Flow multipliers
      const zenFlowTier = state.mode === "zen" ? getZenFlowTier(newCombo) : null;
      const zenFlowMult = zenFlowTier?.mult ?? 1;
      const scoreMult = (isFever ? 2 : 1) * (isOverdrive ? OVERDRIVE_SCORE_MULT : 1) * zenFlowMult;

      const lineScore  = Math.floor(baseScore * b2bMult * scoreMult);

      const comboBonus = cleared > 0
        ? Math.floor((COMBO_BONUSES[Math.min(newCombo, COMBO_BONUSES.length - 1)] ?? 400) * scoreMult)
        : 0;

      const newScore = state.score + lineScore + comboBonus;
      const newLines = state.lines + cleared;
      const newLevel = Math.floor(newLines / 10) + 1;

      // Event trigger
      if (state.mode === "storm" && linesUntilEvent <= 0 && cleared > 0) {
        linesUntilEvent = 5;
        overdriveActive = false; // clear any prior overdrive when a new event fires
        const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        activeEvent = event.type;
        if (event.type === "freeze") {
          eventEndsAt = Date.now() + FREEZE_DURATION;
        } else if (event.type === "fever") {
          eventEndsAt = Date.now() + FEVER_DURATION;
        } else if (event.type === "lightning") {
          board = applyEvent(board, event.type);
          eventEndsAt = Date.now() + 2000;
        } else if (event.type === "bomb") {
          board = applyEvent(board, event.type);
          eventEndsAt = Date.now() + 2000;
        } else if (event.type === "whirlwind") {
          board = applyEvent(board, event.type);
          eventEndsAt = Date.now() + 2000;
        } else if (event.type === "curse") {
          board = applyEvent(board, event.type);
          eventEndsAt = Date.now() + 2000;
        } else if (event.type === "overdrive") {
          eventEndsAt = Date.now() + OVERDRIVE_DURATION;
          overdriveActive = true;
        }
      }

      // Expire time-based events
      const now = action.type === "TICK" ? action.now : Date.now();
      if (eventEndsAt && now > eventEndsAt) {
        activeEvent = null;
        eventEndsAt = null;
        overdriveActive = false;
      }

      // Spawn next piece
      const { active, bag, nextPieces } = drawFromBag({ ...state, bag: state.bag, nextPieces: state.nextPieces });

      // Check top-out (game over)
      if (!isValid(board, active)) {
        return {
          ...state,
          board,
          score: newScore,
          lines: newLines,
          level: newLevel,
          status: "over",
          combo: 0,
          streak: 0,
          tSpinType: "none",
          lastClearWasTetrisOrTSpin: false,
          overdriveActive,
          lastWasRotation: false,
          lastClearedRows: clearedRows,
        };
      }

      return {
        ...state,
        board,
        active,
        bag,
        nextPieces,
        canHold: true,
        score: newScore,
        lines: newLines,
        level: newLevel,
        activeEvent,
        eventEndsAt,
        overdriveActive,
        linesUntilEvent: Math.max(linesUntilEvent, 0),
        combo: newCombo,
        streak: newStreak,
        lastClearWasTetrisOrTSpin: cleared > 0 ? isTetrisOrTSpin : state.lastClearWasTetrisOrTSpin,
        tSpinType: cleared > 0 ? tSpinType : "none",
        lastWasRotation: false,
        lastClearedRows: clearedRows,
      };
    }

    case "HARD_DROP": {
      if (state.status !== "playing") return state;
      if (state.activeEvent === "freeze") return state;
      let dropped = { ...state.active };
      let dropDist = 0;
      while (isValid(state.board, { ...dropped, row: dropped.row + 1 })) {
        dropped.row++;
        dropDist++;
      }
      const locked = { ...state, active: dropped, score: state.score + dropDist * 2, lastWasRotation: false };
      return tetrisReducer(locked, { type: "TICK", now: Date.now() });
    }

    default:
      return state;
  }
}

export { getAbsCells, ghostRow, isValid };
// Re-export getSpeed for use in page
export { getSpeed };
