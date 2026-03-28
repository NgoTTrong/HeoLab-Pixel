import Link from "next/link";

type CardColor = "green" | "pink" | "yellow" | "blue";

interface GameCardProps {
  title: string;
  subtitle: string;
  href: string;
  color: CardColor;
  emoji: string;
  tag: string;
}

const borderColorMap: Record<CardColor, string> = {
  green: "border-neon-green",
  pink: "border-neon-pink",
  yellow: "border-neon-yellow",
  blue: "border-neon-blue",
};

const hoverShadowMap: Record<CardColor, string> = {
  green: "hover:shadow-[0_0_20px_rgba(57,255,20,0.3)]",
  pink: "hover:shadow-[0_0_20px_rgba(255,45,149,0.3)]",
  yellow: "hover:shadow-[0_0_20px_rgba(255,230,0,0.3)]",
  blue: "hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]",
};

const tagColorMap: Record<CardColor, string> = {
  green: "bg-neon-green/20 text-neon-green",
  pink: "bg-neon-pink/20 text-neon-pink",
  yellow: "bg-neon-yellow/20 text-neon-yellow",
  blue: "bg-neon-blue/20 text-neon-blue",
};

export default function GameCard({
  title,
  subtitle,
  href,
  color,
  emoji,
  tag,
}: GameCardProps) {
  return (
    <Link href={href} className="block group">
      <div
        className={`bg-dark-card border ${borderColorMap[color]} rounded-sm p-4 sm:p-6
          transition-all duration-200 ${hoverShadowMap[color]}
          group-hover:scale-[1.02]`}
      >
        <div className="text-3xl mb-4">{emoji}</div>
        <h2
          className={`text-xs neon-text neon-text-${color} mb-2`}
        >
          {title}
        </h2>
        <p className="text-[0.5rem] sm:text-[0.55rem] text-gray-400 leading-relaxed mb-3 sm:mb-4">
          {subtitle}
        </p>
        <span
          className={`text-[0.5rem] px-2 py-1 rounded-sm ${tagColorMap[color]}`}
        >
          {tag}
        </span>
      </div>
    </Link>
  );
}
