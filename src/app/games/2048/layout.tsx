import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monster 2048 — Free 2048 Game | HeoLab",
  description:
    "Play Monster 2048, merge pixel monsters to evolve them into a legendary Dragon. Free browser game, no download needed.",
  keywords: [
    "free 2048",
    "2048 game online",
    "merge game browser",
    "pixel 2048",
    "monster 2048",
    "free puzzle game",
    "HeoLab",
  ],
  alternates: { canonical: "https://heolab.dev/games/2048" },
  openGraph: {
    title: "Monster 2048 — Free 2048 Game | HeoLab",
    description: "Merge pixel monsters to evolve them. Can you reach the Dragon?",
    url: "https://heolab.dev/games/2048",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
