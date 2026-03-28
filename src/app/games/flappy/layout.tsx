import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pixel Flap — Free Flappy Bird Game | HeoLab",
  description: "Play Pixel Flap, a Flappy Bird game with time-of-day themes, obstacle milestones, and medal system. Free browser game, no download.",
  openGraph: {
    title: "Pixel Flap — Free Flappy Bird Game | HeoLab",
    description: "Flappy Bird with time-of-day themes and medal system. Free browser game.",
    url: "https://heolab.dev/games/flappy",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
