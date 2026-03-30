"use client";

import React, { useState } from "react";
import { CARS, TRACKS } from "./config";
import type { GameMode } from "./types";
import PixelButton from "@/components/PixelButton";

interface MenuProps {
  onStart: (mode: GameMode, carIndex: number, trackIndex: number) => void;
}

const STAT_KEYS = ["speed", "drift", "boost", "handling"] as const;
const STAT_MAX = 5;

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-neon-green border-neon-green bg-neon-green/10",
  medium: "text-neon-yellow border-neon-yellow bg-neon-yellow/10",
  hard: "text-neon-pink border-neon-pink bg-neon-pink/10",
};

export default function Menu({ onStart }: MenuProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>("timeAttack");
  const [selectedCar, setSelectedCar] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(0);

  const handlePrevCar = () =>
    setSelectedCar((c) => (c - 1 + CARS.length) % CARS.length);
  const handleNextCar = () =>
    setSelectedCar((c) => (c + 1) % CARS.length);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto px-4 py-8">
      {/* Title */}
      <h1 className="text-2xl sm:text-3xl neon-text-orange font-[family-name:var(--font-press-start)] uppercase tracking-wider">
        PIXEL DRIFT
      </h1>

      {/* Mode Select */}
      <section className="w-full">
        <h2 className="text-[0.6rem] text-neon-orange/70 font-[family-name:var(--font-press-start)] uppercase mb-3 text-center">
          MODE
        </h2>
        <div className="flex gap-3 justify-center">
          {(["timeAttack", "race"] as const).map((mode) => {
            const isSelected = selectedMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`px-4 py-3 border-2 font-[family-name:var(--font-press-start)] text-[0.55rem] sm:text-[0.65rem] uppercase transition-all ${
                  isSelected
                    ? "border-neon-orange neon-border-orange text-neon-orange bg-neon-orange/10"
                    : "border-dark-border text-gray-500 hover:border-gray-500 hover:text-gray-400"
                }`}
              >
                {mode === "timeAttack" ? "TIME ATTACK" : "RACE"}
              </button>
            );
          })}
        </div>
        <p className="text-[0.45rem] text-gray-500 font-[family-name:var(--font-press-start)] text-center mt-2">
          {selectedMode === "timeAttack"
            ? "SOLO RUN - BEAT YOUR BEST TIME"
            : "VS 3 AI OPPONENTS"}
        </p>
      </section>

      {/* Car Select */}
      <section className="w-full">
        <h2 className="text-[0.6rem] text-neon-orange/70 font-[family-name:var(--font-press-start)] uppercase mb-3 text-center">
          CAR
        </h2>
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={handlePrevCar}
            className="text-neon-orange text-xl hover:scale-125 transition-transform px-2"
            aria-label="Previous car"
          >
            &#9664;
          </button>

          <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-hide">
            {CARS.map((car, i) => {
              const isSelected = selectedCar === i;
              return (
                <button
                  key={car.slug}
                  onClick={() => setSelectedCar(i)}
                  className={`flex-shrink-0 border-2 p-3 transition-all min-w-[140px] sm:min-w-[160px] ${
                    isSelected
                      ? "border-neon-orange neon-border-orange bg-neon-orange/5"
                      : "border-dark-border hover:border-gray-500"
                  }`}
                >
                  {/* Color swatch */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-5 h-5 border border-dark-border"
                      style={{ backgroundColor: car.bodyColor }}
                    />
                    <span
                      className="text-[0.5rem] font-[family-name:var(--font-press-start)] uppercase"
                      style={{ color: isSelected ? car.bodyColor : "#9ca3af" }}
                    >
                      {car.name}
                    </span>
                  </div>

                  {/* Stat bars */}
                  <div className="flex flex-col gap-1.5">
                    {STAT_KEYS.map((stat) => (
                      <div key={stat} className="flex items-center gap-1.5">
                        <span className="text-[0.35rem] text-gray-500 font-[family-name:var(--font-press-start)] uppercase w-8 text-right">
                          {stat.slice(0, 3)}
                        </span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: STAT_MAX }, (_, b) => (
                            <div
                              key={b}
                              className="w-2.5 h-2.5 border border-dark-border"
                              style={{
                                backgroundColor:
                                  b < car[stat]
                                    ? car.bodyColor
                                    : "rgba(42,42,74,0.5)",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextCar}
            className="text-neon-orange text-xl hover:scale-125 transition-transform px-2"
            aria-label="Next car"
          >
            &#9654;
          </button>
        </div>
      </section>

      {/* Track Select */}
      <section className="w-full">
        <h2 className="text-[0.6rem] text-neon-orange/70 font-[family-name:var(--font-press-start)] uppercase mb-3 text-center">
          TRACK
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRACKS.map((track, i) => {
            const isSelected = selectedTrack === i;
            const palette = track.palette;
            return (
              <button
                key={track.slug}
                onClick={() => setSelectedTrack(i)}
                className={`border-2 p-3 text-left transition-all ${
                  isSelected
                    ? "border-neon-orange neon-border-orange bg-neon-orange/5"
                    : "border-dark-border hover:border-gray-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[0.5rem] font-[family-name:var(--font-press-start)] uppercase"
                    style={{ color: isSelected ? "#f97316" : "#9ca3af" }}
                  >
                    {track.name}
                  </span>
                  <span
                    className={`text-[0.4rem] font-[family-name:var(--font-press-start)] uppercase border px-1.5 py-0.5 ${DIFFICULTY_COLORS[track.difficulty]}`}
                  >
                    {track.difficulty}
                  </span>
                </div>
                {/* Palette preview strip */}
                <div className="flex h-2 w-full overflow-hidden border border-dark-border">
                  {[
                    palette.sky1,
                    palette.sky2,
                    palette.road1,
                    palette.grass1,
                    palette.rumble1,
                    palette.fog,
                  ].map((color, ci) => (
                    <div
                      key={ci}
                      className="flex-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Start Button */}
      <div className="pt-2">
        <PixelButton
          color="orange"
          onClick={() => onStart(selectedMode, selectedCar, selectedTrack)}
          className="text-[0.6rem] sm:text-xs px-8 py-4"
        >
          {selectedMode === "timeAttack" ? "START TIME ATTACK" : "START RACE"}
        </PixelButton>
      </div>
    </div>
  );
}
