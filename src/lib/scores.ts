export function getHighScore(game: string): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem(`gamestation-${game}-highscore`);
  return val ? parseInt(val, 10) : 0;
}

export function setHighScore(game: string, score: number): void {
  if (typeof window === "undefined") return;
  const current = getHighScore(game);
  if (score > current) {
    localStorage.setItem(`gamestation-${game}-highscore`, String(score));
  }
}

export function getBestTime(game: string): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(`gamestation-${game}-besttime`);
  return val ? parseInt(val, 10) : null;
}

export function setBestTime(game: string, time: number): void {
  if (typeof window === "undefined") return;
  const current = getBestTime(game);
  if (current === null || time < current) {
    localStorage.setItem(`gamestation-${game}-besttime`, String(time));
  }
}
