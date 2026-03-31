"use client";

import React from "react";
import type { GameHelp } from "@/lib/gameHelp";

type GameColor = "green" | "pink" | "yellow" | "blue" | "orange";

interface HelpModalProps {
  help: GameHelp;
  color: GameColor;
  onClose: () => void;
}

const neonText: Record<GameColor, string> = {
  green: "neon-text-green",
  pink: "neon-text-pink",
  yellow: "neon-text-yellow",
  blue: "neon-text-blue",
  orange: "neon-text-orange",
};

const borderColor: Record<GameColor, string> = {
  green: "border-neon-green/40",
  pink: "border-neon-pink/40",
  yellow: "border-neon-yellow/40",
  blue: "border-neon-blue/40",
  orange: "border-neon-orange/40",
};

const sectionBorder: Record<GameColor, string> = {
  green: "border-neon-green/20",
  pink: "border-neon-pink/20",
  yellow: "border-neon-yellow/20",
  blue: "border-neon-blue/20",
  orange: "border-neon-orange/20",
};

const keyBorder: Record<GameColor, string> = {
  green: "border-neon-green/60 text-neon-green",
  pink: "border-neon-pink/60 text-neon-pink",
  yellow: "border-neon-yellow/60 text-neon-yellow",
  blue: "border-neon-blue/60 text-neon-blue",
  orange: "border-neon-orange/60 text-neon-orange",
};

export default function HelpModal({ help, color, onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-[overlayIn_0.3s_ease-out]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className={`relative w-[92vw] max-w-md max-h-[82vh] overflow-y-auto border ${borderColor[color]} p-4 flex flex-col gap-4`}
        style={{ backgroundColor: "#0d0d1a" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className={`text-[0.55rem] ${neonText[color]} tracking-widest`}>
            HOW TO PLAY
          </h2>
          <button
            onClick={onClose}
            className={`text-[0.55rem] ${neonText[color]} hover:opacity-70 transition-opacity px-1`}
          >
            X
          </button>
        </div>

        {/* Objective */}
        <div className="flex flex-col gap-2">
          <p className={`text-[0.45rem] text-gray-500 uppercase tracking-widest border-b ${sectionBorder[color]} pb-1`}>
            Objective
          </p>
          <p className="text-[0.5rem] text-gray-300 leading-relaxed">
            {help.objective}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
          <p className={`text-[0.45rem] text-gray-500 uppercase tracking-widest border-b ${sectionBorder[color]} pb-1`}>
            Controls
          </p>
          <div className="flex flex-col gap-1.5">
            {help.controls.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`inline-block px-1.5 py-0.5 border ${keyBorder[color]} text-[0.45rem] shrink-0`}>
                  {c.key}
                </span>
                <span className="text-[0.45rem] text-gray-400">{c.action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring */}
        {help.scoring && help.scoring.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className={`text-[0.45rem] text-gray-500 uppercase tracking-widest border-b ${sectionBorder[color]} pb-1`}>
              Scoring
            </p>
            <div className="flex flex-col gap-2">
              {help.scoring.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-base leading-none shrink-0">{s.icon}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[0.45rem] ${neonText[color]}`}>{s.name}</span>
                    <span className="text-[0.45rem] text-gray-400 leading-relaxed">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Mechanics */}
        {help.specials && help.specials.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className={`text-[0.45rem] text-gray-500 uppercase tracking-widest border-b ${sectionBorder[color]} pb-1`}>
              Special Mechanics
            </p>
            <div className="flex flex-col gap-2">
              {help.specials.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-base leading-none shrink-0">{s.icon}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[0.45rem] ${neonText[color]}`}>{s.name}</span>
                    <span className="text-[0.45rem] text-gray-400 leading-relaxed">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
