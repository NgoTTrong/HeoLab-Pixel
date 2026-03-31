import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Block Storm — Free Tetris Game | HeoLab",
  description: "Play Block Storm, a Tetris game with random chaos events. Lightning strikes, bomb blocks, ice freeze and fever mode. Free browser game.",
  keywords: [
    "free tetris",
    "tetris online",
    "browser tetris",
    "block game online",
    "pixel tetris",
    "free arcade game",
    "HeoLab",
  ],
  alternates: { canonical: "https://heolab.dev/games/tetris" },
  openGraph: {
    title: "Block Storm — Free Tetris Game | HeoLab",
    description: "Tetris with random chaos events. Lightning, bombs, ice freeze, and fever mode.",
    url: "https://heolab.dev/games/tetris",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
