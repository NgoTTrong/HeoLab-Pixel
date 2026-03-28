"use client";

import React from "react";

type ButtonColor = "green" | "pink" | "yellow" | "blue";

interface PixelButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  color?: ButtonColor;
  disabled?: boolean;
  className?: string;
}

const colorClasses: Record<ButtonColor, string> = {
  green: "text-neon-green border-neon-green neon-border-green",
  pink: "text-neon-pink border-neon-pink neon-border-pink",
  yellow: "text-neon-yellow border-neon-yellow neon-border-yellow",
  blue: "text-neon-blue border-neon-blue neon-border-blue",
};

export default function PixelButton({
  onClick,
  children,
  color = "green",
  disabled = false,
  className = "",
}: PixelButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pixel-btn ${colorClasses[color]} ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}
