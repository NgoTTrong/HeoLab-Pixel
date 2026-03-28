import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neon Serpent — Free Snake Game | HeoLab",
  description:
    "Play Neon Serpent, a cyberpunk snake game with neon trails and power-ups. Speed Boost, Ghost Mode, Score ×2. Free browser game, no download.",
  openGraph: {
    title: "Neon Serpent — Free Snake Game | HeoLab",
    description: "Cyberpunk snake with neon trails and power-ups. Free browser game.",
    url: "https://heolab.dev/games/snake",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
