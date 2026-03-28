import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rune Sudoku — Free Sudoku Game | HeoLab",
  description:
    "Play Rune Sudoku, a mystical take on classic Sudoku with Elder Futhark runes. Free browser game, no download needed.",
  openGraph: {
    title: "Rune Sudoku — Free Sudoku Game | HeoLab",
    description: "Decode ancient runes in this mystical Sudoku game.",
    url: "https://heolab.dev/games/sudoku",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
