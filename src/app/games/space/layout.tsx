import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Astro Raid — Free Space Invaders Game | HeoLab",
  description: "Play Astro Raid, a Space Invaders game with multiple wave patterns, power-ups (Triple Shot, Shield, Bomb), and boss battles every 5 waves. Free browser game.",
  keywords: [
    "free space invaders",
    "space invaders online",
    "browser space shooter",
    "astro raid",
    "pixel space game",
    "free arcade game",
    "HeoLab",
  ],
  alternates: { canonical: "https://heolab.dev/games/space" },
  openGraph: {
    title: "Astro Raid — Free Space Invaders Game | HeoLab",
    description: "Space Invaders with power-ups and boss battles. Free browser game.",
    url: "https://heolab.dev/games/space",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
