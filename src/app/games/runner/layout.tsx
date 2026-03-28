import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pixel Dash — Free Endless Runner Game | HeoLab",
  description: "Play Pixel Dash, an endless runner with unlockable characters (Dino, Robot, Ninja), double jump, and world themes. Free browser game.",
  openGraph: {
    title: "Pixel Dash — Free Endless Runner Game | HeoLab",
    description: "Endless runner with unlockable characters and world themes. Free browser game.",
    url: "https://heolab.dev/games/runner",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
