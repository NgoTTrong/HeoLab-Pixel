import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pixel Dash — Free Endless Runner Game | HeoLab",
  description: "Play Pixel Dash, an endless runner with unlockable characters (Dino, Robot, Ninja), double jump, and world themes. Free browser game.",
  keywords: [
    "free endless runner",
    "endless runner online",
    "browser runner game",
    "pixel dash",
    "dino runner game",
    "free casual game",
    "HeoLab",
  ],
  alternates: { canonical: "https://heolab.dev/games/runner" },
  openGraph: {
    title: "Pixel Dash — Free Endless Runner Game | HeoLab",
    description: "Endless runner with unlockable characters and world themes. Free browser game.",
    url: "https://heolab.dev/games/runner",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
