import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
});

export const metadata: Metadata = {
  title: "GameStation - Retro Puzzle Arcade",
  description: "A retro pixel-art puzzle arcade with classic games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pressStart.variable} h-full`}>
      <body className="min-h-full flex flex-col font-pixel">
        <div className="scanline-overlay" />
        {children}
      </body>
    </html>
  );
}
