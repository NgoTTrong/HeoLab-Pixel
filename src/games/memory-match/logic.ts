import { CardData, GridSize, MemoryState, CREATURES } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createMemory(size: GridSize): MemoryState {
  const pairs = size === "easy" ? 8 : 18;
  const cols = size === "easy" ? 4 : 6;

  const picked = shuffle(CREATURES).slice(0, pairs);
  const cards: CardData[] = [];

  picked.forEach((creature, i) => {
    cards.push({
      id: i * 2,
      emoji: creature.emoji,
      name: creature.name,
      isFlipped: false,
      isMatched: false,
    });
    cards.push({
      id: i * 2 + 1,
      emoji: creature.emoji,
      name: creature.name,
      isFlipped: false,
      isMatched: false,
    });
  });

  return {
    cards: shuffle(cards),
    cols,
    flipped: [],
    score: 0,
    combo: 0,
    moves: 0,
    matched: 0,
    total: pairs,
    completed: false,
    processing: false,
  };
}

export function flipCard(state: MemoryState, index: number): MemoryState {
  const card = state.cards[index];
  if (!card || card.isFlipped || card.isMatched || state.processing || state.flipped.length >= 2) {
    return state;
  }

  const newCards = state.cards.map((c, i) =>
    i === index ? { ...c, isFlipped: true } : c
  );
  const newFlipped = [...state.flipped, index];
  const isSecondFlip = newFlipped.length === 2;

  return {
    ...state,
    cards: newCards,
    flipped: newFlipped,
    moves: isSecondFlip ? state.moves + 1 : state.moves,
    processing: isSecondFlip,
  };
}

export function checkMatch(state: MemoryState): MemoryState {
  if (state.flipped.length !== 2) return state;

  const [i, j] = state.flipped;
  const a = state.cards[i];
  const b = state.cards[j];
  const isMatch = a.name === b.name;

  if (isMatch) {
    const newCombo = state.combo + 1;
    const newMatched = state.matched + 1;
    const newCards = state.cards.map((c, idx) =>
      idx === i || idx === j ? { ...c, isMatched: true } : c
    );
    return {
      ...state,
      cards: newCards,
      flipped: [],
      combo: newCombo,
      score: state.score + 100 * newCombo,
      matched: newMatched,
      completed: newMatched === state.total,
      processing: false,
    };
  }

  const newCards = state.cards.map((c, idx) =>
    idx === i || idx === j ? { ...c, isFlipped: false } : c
  );
  return {
    ...state,
    cards: newCards,
    flipped: [],
    combo: 0,
    processing: false,
  };
}
