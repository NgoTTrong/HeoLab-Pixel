"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <span className="font-pixel text-neon-green text-xs">&lt;</span>
          <span className="font-bold text-white text-base tracking-tight">HeoLab</span>
          <span className="font-pixel text-neon-green text-xs">/&gt;</span>
        </Link>

        {/* Right links */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/games"
            className="hidden sm:block font-pixel text-[0.45rem] text-gray-500 hover:text-neon-green transition-colors tracking-widest"
          >
            GAMES
          </Link>
          <Link
            href="#about"
            className="hidden sm:block font-pixel text-[0.45rem] text-gray-500 hover:text-neon-green transition-colors tracking-widest"
          >
            ABOUT
          </Link>
          <Link
            href="/games"
            className="font-pixel text-[0.45rem] px-3 py-1.5 border border-neon-green text-neon-green
              hover:bg-neon-green hover:text-black transition-all duration-200 tracking-widest"
          >
            ▶ PLAY
          </Link>
        </div>
      </div>
    </nav>
  );
}
