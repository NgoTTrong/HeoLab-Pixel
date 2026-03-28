import { BOARD_COLS, BOARD_ROWS, LINE_SCORES, RANDOM_EVENTS, getSpeed } from "./config";
import type { EventType } from "./config";
import { TETROMINOES, createBag } from "./tetrominoes";
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
}

export type TetrisAction =
  | { type: "START" }
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

function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((c) => c === null));
  const cleared = BOARD_ROWS - remaining.length;
  const newRows = Array.from({ length: cleared }, () => Array(BOARD_COLS).fill(null));
  return { board: [...newRows, ...remaining], cleared };
}

function ghostRow(board: Board, piece: ActivePiece): number {
  let ghost = { ...piece };
  while (isValid(board, { ...ghost, row: ghost.row + 1 })) ghost.row++;
  return ghost.row;
}

function spawnPiece(type: TetrominoType): ActivePiece {
  return { type, rotation: 0, col: 3, row: 0 };
}

function drawFromBag(state: TetrisState): { active: ActivePiece; bag: TetrominoType[]; nextPieces: TetrominoType[] } {
  let bag = [...state.bag];
  const allPieces = [...state.nextPieces, ...bag];
  if (allPieces.length < 4) bag = [...bag, ...createBag()];
  const next = [...state.nextPieces, ...bag];
  const active = spawnPiece(next[0]);
  return { active, bag: next.slice(4), nextPieces: next.slice(1, 4) };
}

function applyEvent(board: Board, event: EventType): Board {
  const newBoard = board.map((row) => [...row]);
  if (event === "lightning") {
    // Clear a random non-empty row
    const nonEmpty = newBoard.reduce<number[]>((acc, row, i) => {
      if (row.some((c) => c !== null)) acc.push(i);
      return acc;
    }, []);
    if (nonEmpty.length > 0) {
      const targetRow = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
      newBoard.splice(targetRow, 1);
      newBoard.unshift(Array(BOARD_COLS).fill(null));
    }
  }
  return newBoard;
}

function initialState(): TetrisState {
  const bag1 = createBag();
  const bag2 = createBag();
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
  };
}

export function tetrisReducer(state: TetrisState, action: TetrisAction): TetrisState {
  switch (action.type) {
    case "START":
      return { ...initialState(), status: "playing" };
    case "RESET":
      return initialState();

    case "CLEAR_EVENT":
      return { ...state, activeEvent: null, eventEndsAt: null };

    case "MOVE_LEFT": {
      if (state.status !== "playing") return state;
      const moved = { ...state.active, col: state.active.col - 1 };
      return isValid(state.board, moved) ? { ...state, active: moved } : state;
    }
    case "MOVE_RIGHT": {
      if (state.status !== "playing") return state;
      const moved = { ...state.active, col: state.active.col + 1 };
      return isValid(state.board, moved) ? { ...state, active: moved } : state;
    }
    case "ROTATE": {
      if (state.status !== "playing") return state;
      const rotated = { ...state.active, rotation: (state.active.rotation + 1) % 4 };
      // Wall kick: try col offsets [0, -1, 1, -2, 2]
      for (const offset of [0, -1, 1, -2, 2]) {
        const kicked = { ...rotated, col: rotated.col + offset };
        if (isValid(state.board, kicked)) return { ...state, active: kicked };
      }
      return state;
    }
    case "HOLD": {
      if (state.status !== "playing" || !state.canHold) return state;
      const newHeld = state.active.type;
      const { active, bag, nextPieces } = state.held
        ? { active: spawnPiece(state.held), bag: state.bag, nextPieces: state.nextPieces }
        : drawFromBag(state);
      return { ...state, active, held: newHeld, canHold: false, bag, nextPieces };
    }

    case "MOVE_DOWN":
    case "TICK": {
      if (state.status !== "playing") return state;
      if (state.activeEvent === "freeze" && action.type === "TICK") return state; // freeze pauses auto-drop

      const moved = { ...state.active, row: state.active.row + 1 };
      if (isValid(state.board, moved)) {
        return { ...state, active: moved };
      }

      // Lock piece
      let board = lockPiece(state.board, state.active);
      const { board: clearedBoard, cleared } = clearLines(board);
      board = clearedBoard;

      // Score
      const isFever = state.activeEvent === "fever";
      const multiplier = isFever ? 2 : 1;
      const lineScore = LINE_SCORES[Math.min(cleared, 4)] * multiplier;
      const newScore = state.score + lineScore;
      const newLines = state.lines + cleared;
      const newLevel = Math.floor(newLines / 10) + 1;

      // Event trigger
      let linesUntilEvent = state.linesUntilEvent - cleared;
      let activeEvent = state.activeEvent;
      let eventEndsAt = state.eventEndsAt;

      if (linesUntilEvent <= 0 && cleared > 0) {
        linesUntilEvent = 5;
        const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        activeEvent = event.type;
        if (event.type === "freeze") {
          board = applyEvent(board, event.type);
          eventEndsAt = Date.now() + 3000;
        } else if (event.type === "fever") {
          eventEndsAt = Date.now() + 30000;
        } else if (event.type === "lightning") {
          board = applyEvent(board, event.type);
          eventEndsAt = Date.now() + 2000;
        } else if (event.type === "bomb") {
          eventEndsAt = Date.now() + 2000; // just banner
        }
      }

      // Expire time-based events
      if (eventEndsAt && Date.now() > eventEndsAt) {
        activeEvent = null;
        eventEndsAt = null;
      }

      // Spawn next piece
      const { active, bag, nextPieces } = drawFromBag({ ...state, bag: state.bag, nextPieces: state.nextPieces });

      // Check top-out (game over)
      if (!isValid(board, active)) {
        return { ...state, board, score: newScore, lines: newLines, level: newLevel, status: "over" };
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
        linesUntilEvent: Math.max(linesUntilEvent, 0),
      };
    }

    case "HARD_DROP": {
      if (state.status !== "playing") return state;
      let dropped = { ...state.active };
      let dropDist = 0;
      while (isValid(state.board, { ...dropped, row: dropped.row + 1 })) {
        dropped.row++;
        dropDist++;
      }
      const locked = { ...state, active: dropped, score: state.score + dropDist * 2 };
      return tetrisReducer(locked, { type: "TICK", now: Date.now() });
    }

    default:
      return state;
  }
}

export { getAbsCells, ghostRow, isValid };
// Re-export getSpeed for use in page
export { getSpeed };
