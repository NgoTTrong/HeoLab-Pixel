"use client";

interface Props {
  muted: boolean;
  onToggle: () => void;
  color?: "green" | "pink" | "blue" | "yellow";
}

const colorMap: Record<string, string> = {
  green:  "hover:border-neon-green  hover:text-neon-green",
  pink:   "hover:border-neon-pink   hover:text-neon-pink",
  blue:   "hover:border-neon-blue   hover:text-neon-blue",
  yellow: "hover:border-neon-yellow hover:text-neon-yellow",
};

export default function MuteButton({ muted, onToggle, color = "blue" }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`font-pixel text-[0.5rem] border border-gray-600 px-1.5 py-0.5 transition-colors ${colorMap[color]}`}
      title={muted ? "Unmute sound" : "Mute sound"}
    >
      {muted ? "🔇 OFF" : "🔊 ON"}
    </button>
  );
}
