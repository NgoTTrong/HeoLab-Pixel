import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixel Bestiary — Free Memory Match Game | HeoLab",
  description:
    "Play Pixel Bestiary, a memory match game with pixel creatures. Build combos for bonus points. Free browser game, no download needed.",
  keywords: [
    "memory match game",
    "free memory game",
    "card matching game online",
    "pixel memory game",
    "browser memory game",
    "free puzzle game",
    "HeoLab",
  ],
  alternates: { canonical: "https://heolab.dev/games/memory-match" },
  openGraph: {
    title: "Pixel Bestiary — Free Memory Match Game | HeoLab",
    description: "Match pixel creatures and build combos for bonus points.",
    url: "https://heolab.dev/games/memory-match",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
