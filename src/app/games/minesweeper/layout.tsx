import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dungeon Sweep — Free Minesweeper Game | HeoLab",
  description:
    "Play Dungeon Sweep, a pixel RPG minesweeper. Clear the dungeon without waking the monsters. Free, no download needed.",
  openGraph: {
    title: "Dungeon Sweep — Free Minesweeper Game | HeoLab",
    description: "Clear the dungeon without waking the monsters.",
    url: "https://heolab.dev/games/minesweeper",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
