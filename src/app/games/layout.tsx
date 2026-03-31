import { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Games — Free Browser Games | HeoLab",
  description:
    "Browse all free browser games on HeoLab. Puzzle, casual, and arcade games — Minesweeper, 2048, Sudoku, Snake, Tetris, Pac-Man, and more. No download, no account needed.",
  keywords: [
    "free browser games",
    "free online games",
    "play games online",
    "browser games no download",
    "arcade games online",
    "puzzle games online",
    "casual games browser",
    "HeoLab games",
  ],
  alternates: { canonical: "https://heolab.dev/games" },
  openGraph: {
    title: "All Games — Free Browser Games | HeoLab",
    description: "Browse all free browser games on HeoLab. No download, no account needed.",
    url: "https://heolab.dev/games",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
