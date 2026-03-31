import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixel Chomp — Free Pac-Man Game | HeoLab",
  description:
    "Play Pixel Chomp, a retro Pac-Man arcade game with ghost AI, power crystals, and customizable gameplay modifiers. Free browser game, no download.",
  keywords: [
    "free pacman",
    "pac-man online",
    "browser pacman game",
    "pixel chomp",
    "ghost maze game",
    "free arcade game",
    "HeoLab",
  ],
  alternates: { canonical: "https://heolab.dev/games/pacman" },
  openGraph: {
    title: "Pixel Chomp — Free Pac-Man Game | HeoLab",
    description: "Retro Pac-Man with smart ghost AI and gameplay modifiers. Free browser game.",
    url: "https://heolab.dev/games/pacman",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
