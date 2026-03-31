import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixel Drift — Free Racing Game | HeoLab",
  description:
    "Play Pixel Drift, a neon retro racing game with drift mechanics, boost system, ghost replay, and multiple tracks. Free browser game, no download needed.",
  keywords: [
    "pixel drift",
    "free racing game",
    "browser racing game",
    "drift game online",
    "neon racing game",
    "retro racing browser",
    "free car game",
    "HeoLab",
  ],
  alternates: { canonical: "https://heolab.dev/games/drift" },
  openGraph: {
    title: "Pixel Drift — Free Racing Game | HeoLab",
    description: "Neon retro racing with drift mechanics and ghost replay. Free browser game.",
    url: "https://heolab.dev/games/drift",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
