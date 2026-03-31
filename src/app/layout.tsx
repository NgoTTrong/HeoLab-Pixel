import type { Metadata } from "next";
import { Press_Start_2P, Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://heolab.dev"),
  title: "HeoLab — Play Free Browser Games",
  description:
    "HeoLab is an indie game lab with free browser games. Play Minesweeper, 2048, Sudoku and more — no download needed.",
  keywords: [
    "free browser games",
    "free online games",
    "play games online",
    "browser games no download",
    "HeoLab",
    "indie games",
    "pixel games",
    "arcade games online",
  ],
  openGraph: {
    type: "website",
    url: "https://heolab.dev",
    title: "HeoLab — Play Free Browser Games",
    description:
      "HeoLab is an indie game lab with free browser games. Play Minesweeper, 2048, Sudoku and more — no download needed.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "HeoLab" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HeoLab — Play Free Browser Games",
    description: "Free browser games, crafted with care.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${pressStart.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col font-pixel">
        <div className="scanline-overlay" />
        {children}
      </body>
      <GoogleAnalytics gaId="G-EYW08N266H" />
    </html>
  );
}
