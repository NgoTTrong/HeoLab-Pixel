import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixel Chomp — Free Pac-Man Game | HeoLab",
  description:
    "Play Pixel Chomp, a retro Pac-Man arcade game with ghost AI, power crystals, and customizable gameplay modifiers. Free browser game, no download.",
  openGraph: {
    title: "Pixel Chomp — Free Pac-Man Game | HeoLab",
    description: "Retro Pac-Man with smart ghost AI and gameplay modifiers. Free browser game.",
    url: "https://heolab.dev/games/pacman",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
