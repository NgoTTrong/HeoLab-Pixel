"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { usePixelSound } from "@/hooks/usePixelSound";

// ── Types ────────────────────────────────────────────────
type Category = "ALL" | "PUZZLE" | "CASUAL" | "ARCADE";

type EmojiPhysics = {
  relX: number;
  relY: number;
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
};

type Meteor = { x: number; y: number; vx: number; vy: number; el: HTMLDivElement };
type Ship   = {
  cx: number; cy: number; rx: number; ry: number;
  angle: number; speed: number;
  el: HTMLDivElement;
  fireIn: number;
};
type Laser  = { x: number; y: number; vx: number; vy: number; el: HTMLDivElement; ttl: number };

// ── Data ────────────────────────────────────────────────
const allGames = [
  {
    title: "DUNGEON SWEEP",
    subtitle: "Pixel RPG minesweeper. Clear the dungeon without waking the monsters.",
    href: "/games/minesweeper",
    borderColor: "#39ff14",
    emoji: "💀",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
  },
  {
    title: "MONSTER 2048",
    subtitle: "Merge pixel monsters to evolve them. Can you reach the Dragon?",
    href: "/games/2048",
    borderColor: "#ff2d95",
    emoji: "🐉",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
  },
  {
    title: "RUNE SUDOKU",
    subtitle: "Decode ancient runes in this mystical take on classic Sudoku.",
    href: "/games/sudoku",
    borderColor: "#00d4ff",
    emoji: "🔮",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
  },
  {
    title: "PIXEL BESTIARY",
    subtitle: "Match pixel creatures from the bestiary. Build combos for bonus points.",
    href: "/games/memory-match",
    borderColor: "#ffe600",
    emoji: "🃏",
    tag: "MEMORY",
    category: "PUZZLE" as Category,
  },
  {
    title: "NEON SERPENT",
    subtitle: "AI hacker snake consuming data packets in a neon network.",
    href: "/games/snake",
    borderColor: "#00d4ff",
    emoji: "🐍",
    tag: "CASUAL",
    category: "CASUAL" as Category,
  },
  {
    title: "PIXEL FLAP",
    subtitle: "Tiny pixel bird flying through an abandoned retro city.",
    href: "/games/flappy",
    borderColor: "#ffe600",
    emoji: "🐦",
    tag: "CASUAL",
    category: "CASUAL" as Category,
  },
  {
    title: "PIXEL DASH",
    subtitle: "Pixel dinosaur escaping a meteor shower. Unlock new runners!",
    href: "/games/runner",
    borderColor: "#39ff14",
    emoji: "🦕",
    tag: "CASUAL",
    category: "CASUAL" as Category,
  },
  {
    title: "BLOCK STORM",
    subtitle: "Stack blocks to hold the crumbling castle. Random chaos events!",
    href: "/games/tetris",
    borderColor: "#f97316",
    emoji: "🧱",
    tag: "ARCADE",
    category: "ARCADE" as Category,
  },
  {
    title: "ASTRO RAID",
    subtitle: "Solo retro spaceship vs pixel alien invaders. Boss every 5 waves!",
    href: "/games/space",
    borderColor: "#a855f7",
    emoji: "👾",
    tag: "ARCADE",
    category: "ARCADE" as Category,
  },
];

const floatingEmojis = [
  { emoji: "💀", top: "18%", left: "8%",  duration: 3.2, delay: 0 },
  { emoji: "🐉", top: "72%", left: "6%",  duration: 4.1, delay: 0.5 },
  { emoji: "🔮", top: "25%", left: "86%", duration: 5.0, delay: 1.0 },
  { emoji: "🐍", top: "12%", left: "74%", duration: 3.6, delay: 0.3 },
  { emoji: "👾", top: "68%", left: "89%", duration: 4.5, delay: 0.8 },
  { emoji: "🧱", top: "82%", left: "18%", duration: 3.9, delay: 0.2 },
];

// ── Space layer helpers ──────────────────────────────────
const mkMeteorState = (W: number, H: number, el: HTMLDivElement): Meteor => {
  const edge = Math.floor(Math.random() * 3); // 0=top 1=left 2=right
  const spd  = 1.2 + Math.random() * 2.0;
  let x: number, y: number, tx: number, ty: number;
  if (edge === 0)      { x = Math.random() * W; y = -50;    tx = Math.random() * W; ty = H + 50; }
  else if (edge === 1) { x = -50;    y = Math.random() * H; tx = W + 50; ty = Math.random() * H; }
  else                 { x = W + 50; y = Math.random() * H; tx = -50;    ty = Math.random() * H; }
  const d = Math.hypot(tx - x, ty - y) || 1;
  return { x, y, vx: (tx - x) / d * spd, vy: (ty - y) / d * spd, el };
};

const SHIP_CONFIGS = [
  { cx: 0.20, cy: 0.30, rx: 130, ry: 55, speed:  0.40, a0: 0 },
  { cx: 0.78, cy: 0.22, rx:  90, ry: 70, speed: -0.35, a0: Math.PI },
  { cx: 0.55, cy: 0.72, rx: 160, ry: 45, speed:  0.50, a0: Math.PI / 2 },
] as const;

const LASER_COLORS = ["#39ff14", "#00d4ff", "#ff2d95"] as const;

const stats = [
  { number: "9",  label: "GAMES" },
  { number: "∞",  label: "PLAYTIME" },
  { number: "0",  label: "DOWNLOADS" },
  { number: "0",  label: "ADS" },
];

const roadmap = [
  { title: "Pac-Man Clone", emoji: "🐱", status: "COMING SOON" },
  { title: "Pong",          emoji: "🏓", status: "COMING SOON" },
  { title: "Brick Breaker", emoji: "💥", status: "COMING SOON" },
];

const socialLinks = [
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
];

const TABS: Category[] = ["ALL", "PUZZLE", "CASUAL", "ARCADE"];

// ── Component ────────────────────────────────────────────
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Category>("ALL");
  const sounds = usePixelSound();

  // Mouse interaction refs (no state → no re-renders)
  const cursorRef       = useRef<HTMLDivElement>(null);
  const heroRef         = useRef<HTMLElement>(null);
  const emojiRefs       = useRef<(HTMLDivElement | null)[]>([]);
  const physicsRef      = useRef<EmojiPhysics[]>([]);
  const mouseRef        = useRef({ x: -9999, y: -9999 });
  const rafRef          = useRef<number | null>(null);
  const lastParticleRef = useRef(0);
  const particleCountRef = useRef(0);
  const liveParticlesRef = useRef<HTMLDivElement[]>([]);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const glitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Glitch effect: periodic RGB split trigger
  useEffect(() => {
    const scheduleGlitch = () => {
      const delay = 2500 + Math.random() * 3500;
      glitchTimerRef.current = setTimeout(() => {
        const el = heroTitleRef.current;
        if (el) {
          el.classList.add("glitching");
          setTimeout(() => {
            el.classList.remove("glitching");
            scheduleGlitch();
          }, 180 + Math.random() * 140);
        } else {
          scheduleGlitch();
        }
      }, delay);
    };
    const init = setTimeout(scheduleGlitch, 1800);
    return () => {
      clearTimeout(init);
      if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    // ── Init physics ──────────────────────────────────────
    const initPhysics = () => {
      physicsRef.current = floatingEmojis.map((item) => ({
        relX: parseFloat(item.left) / 100,
        relY: parseFloat(item.top) / 100,
        offsetX: 0,
        offsetY: 0,
        vx: 0,
        vy: 0,
      }));
    };

    initPhysics();
    window.addEventListener("resize", initPhysics);

    // ── Space objects (meteors + ships) ───────────────────
    const { width: W0, height: H0 } = hero.getBoundingClientRect();

    const meteors: Meteor[] = Array.from({ length: 5 }, () => {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;font-size:1.25rem;pointer-events:none;opacity:0.55;z-index:1;will-change:transform;user-select:none;";
      el.textContent = "☄️";
      hero.appendChild(el);
      return mkMeteorState(W0, H0, el);
    });

    const ships: Ship[] = SHIP_CONFIGS.map((cfg, i) => {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;font-size:1rem;pointer-events:none;opacity:0.55;z-index:2;will-change:transform;user-select:none;";
      el.textContent = "🚀";
      hero.appendChild(el);
      return {
        cx: cfg.cx, cy: cfg.cy, rx: cfg.rx, ry: cfg.ry,
        angle: cfg.a0, speed: cfg.speed, el,
        fireIn: 80 + i * 40 + Math.floor(Math.random() * 60),
      };
    });

    const lasers: Laser[] = [];

    const spawnLaser = (sx: number, sy: number, tdx: number, tdy: number) => {
      if (lasers.length >= 6) return;
      const d = Math.hypot(tdx, tdy) || 1;
      const spd = 4;
      const vx = (tdx / d) * spd;
      const vy = (tdy / d) * spd;
      const color = LASER_COLORS[Math.floor(Math.random() * LASER_COLORS.length)];
      const rot   = Math.atan2(vy, vx) * (180 / Math.PI);
      const el    = document.createElement("div");
      el.style.cssText = [
        "position:absolute",
        `left:${sx}px`, `top:${sy}px`,
        "width:22px", "height:2px",
        `background:${color}`,
        `box-shadow:0 0 6px ${color}`,
        "pointer-events:none", "z-index:3",
        `transform:rotate(${rot}deg)`,
        "transform-origin:left center",
      ].join(";");
      hero.appendChild(el);
      lasers.push({ x: sx, y: sy, vx, vy, el, ttl: 90 });
    };

    // ── Particle spawn ────────────────────────────────────
    const spawnParticle = (cx: number, cy: number) => {
      if (particleCountRef.current >= 25) return;
      const colors = ["#39ff14", "#ff2d95", "#ffe600"];
      const color  = colors[Math.floor(Math.random() * colors.length)];
      const size   = Math.random() * 3 + 2;
      const ox     = (Math.random() - 0.5) * 16;
      const oy     = (Math.random() - 0.5) * 16;

      const el = document.createElement("div");
      el.style.cssText = [
        "position:fixed",
        `left:${cx + ox - size / 2}px`,
        `top:${cy + oy - size / 2}px`,
        `width:${size}px`,
        `height:${size}px`,
        `background:${color}`,
        "border-radius:1px",
        "pointer-events:none",
        "z-index:9999",
        "animation:particleFade 0.5s ease-out forwards",
      ].join(";");

      particleCountRef.current++;
      document.body.appendChild(el);
      liveParticlesRef.current.push(el as HTMLDivElement);
      el.addEventListener("animationend", () => {
        el.remove();
        liveParticlesRef.current = liveParticlesRef.current.filter((p) => p !== el);
        particleCountRef.current--;
      });
    };

    // ── RAF physics loop ──────────────────────────────────
    let heroVisible = true;

    const REPEL_RADIUS = 130;

    const tick = (timestamp: number) => {
      if (!heroVisible) {
        rafRef.current = 0;
        return;
      }
      const t = timestamp / 1000;
      const { x: mx, y: my } = mouseRef.current;
      const heroRect = hero.getBoundingClientRect();

      physicsRef.current.forEach((p, i) => {
        const el   = emojiRefs.current[i];
        const item = floatingEmojis[i];
        if (!el || !item) return;

        // Sinusoidal float
        const phase    = (2 * Math.PI / item.duration) * t + item.delay;
        const floatY   = Math.sin(phase) * 8;
        const floatRot = Math.sin(phase) * 3;

        // Live home position in viewport space
        const homeX = heroRect.left + p.relX * heroRect.width;
        const homeY = heroRect.top  + p.relY * heroRect.height;

        // Current screen center of emoji
        const curX = homeX + p.offsetX;
        const curY = homeY + p.offsetY;
        const dx   = mx - curX;
        const dy   = my - curY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Repel force
        if (dist < REPEL_RADIUS && dist > 1) {
          const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * 10;
          p.vx -= (dx / dist) * force;
          p.vy -= (dy / dist) * force;
        }

        // Spring back to home (offset → 0)
        p.vx += -p.offsetX * 0.08;
        p.vy += -p.offsetY * 0.08;

        // Damping
        p.vx *= 0.85;
        p.vy *= 0.85;

        p.offsetX += p.vx;
        p.offsetY += p.vy;

        el.style.transform = `translate(${p.offsetX}px, ${p.offsetY + floatY}px) rotate(${floatRot}deg)`;
      });

      // ── Meteors ──────────────────────────────────────────
      const W = heroRect.width;
      const H = heroRect.height;

      meteors.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < -80 || m.x > W + 80 || m.y < -80 || m.y > H + 80) {
          Object.assign(m, mkMeteorState(W, H, m.el));
        }
        const ang = Math.atan2(m.vy, m.vx) * (180 / Math.PI);
        m.el.style.transform = `translate(${m.x}px, ${m.y}px) rotate(${ang + 225}deg)`;
      });

      // ── Ships & Lasers ────────────────────────────────────
      ships.forEach((s) => {
        s.angle += s.speed / 60;

        const sx = s.cx * W + Math.cos(s.angle) * s.rx;
        const sy = s.cy * H + Math.sin(s.angle) * s.ry;

        // Tangent direction (derivative of orbit)
        const tdx = -Math.sin(s.angle) * s.rx * s.speed;
        const tdy =  Math.cos(s.angle) * s.ry * s.speed;
        const rot  = Math.atan2(tdy, tdx) * (180 / Math.PI) + 90;

        s.el.style.transform = `translate(${sx}px, ${sy}px) rotate(${rot}deg)`;

        // Fire laser
        s.fireIn--;
        if (s.fireIn <= 0) {
          s.fireIn = 100 + Math.floor(Math.random() * 120);
          spawnLaser(sx, sy, tdx, tdy);
        }
      });

      // Advance + cull lasers (reverse iterate to splice safely)
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.x += l.vx;
        l.y += l.vy;
        l.ttl--;
        if (l.ttl <= 0 || l.x < -30 || l.x > W + 30 || l.y < -30 || l.y > H + 30) {
          l.el.remove();
          lasers.splice(i, 1);
        } else {
          l.el.style.left = `${l.x}px`;
          l.el.style.top  = `${l.y}px`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const observer = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible && rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }, { threshold: 0 });
    observer.observe(hero);

    // ── Mouse events ──────────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX - 8}px, ${e.clientY - 8}px)`;
      }

      const now = Date.now();
      if (now - lastParticleRef.current > 40) {
        lastParticleRef.current = now;
        spawnParticle(e.clientX, e.clientY);
      }
    };

    const handleMouseEnter = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = "1";
    };

    const handleMouseLeave = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = "0";
      mouseRef.current = { x: -9999, y: -9999 };
    };

    hero.addEventListener("mousemove", handleMouseMove);
    hero.addEventListener("mouseenter", handleMouseEnter);
    hero.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", initPhysics);
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseenter", handleMouseEnter);
      hero.removeEventListener("mouseleave", handleMouseLeave);
      liveParticlesRef.current.forEach((el) => el.remove());
      liveParticlesRef.current = [];
      meteors.forEach((m) => m.el.remove());
      ships.forEach((s) => s.el.remove());
      lasers.forEach((l) => l.el.remove());
    };
  }, []);

  const filtered =
    activeTab === "ALL" ? allGames : allGames.filter((g) => g.category === activeTab);

  return (
    <>
      {/* Custom pixel cursor — visible only inside hero */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-[9998] opacity-0"
        style={{ top: 0, left: 0, willChange: "transform" }}
      >
        <div className="relative w-4 h-4">
          <div className="absolute top-[7px] left-0 w-full h-[2px] bg-neon-green shadow-[0_0_4px_#39ff14]" />
          <div className="absolute left-[7px] top-0 h-full w-[2px] bg-neon-green shadow-[0_0_4px_#39ff14]" />
          <div className="absolute top-[5px] left-[5px] w-[6px] h-[6px] bg-neon-green shadow-[0_0_6px_#39ff14]" />
        </div>
      </div>

      <Navbar />
      <main className="font-inter">

        {/* ── HERO ──────────────────────────────────────── */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden"
          style={{ cursor: "none" }}
        >
          {/* Dot grid */}
          <div className="absolute inset-0 hero-dot-grid opacity-60" />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(88,28,135,0.25)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom-right,rgba(0,212,255,0.08)_0%,transparent_50%)]" />

          {/* Planets — background, CSS-driven */}
          <div className="hidden md:block absolute inset-0 pointer-events-none select-none">
            <div
              className="absolute text-[4rem] opacity-[0.10]"
              style={{ top: "6%", right: "12%", animation: "planetDrift 55s ease-in-out infinite alternate" }}
            >🪐</div>
            <div
              className="absolute text-[3rem] opacity-[0.10]"
              style={{ bottom: "8%", left: "5%", animation: "planetDrift 70s ease-in-out 8s infinite alternate-reverse" }}
            >🌍</div>
          </div>

          {/* Floating emojis — desktop only, physics-driven */}
          <div className="hidden md:block absolute inset-0 pointer-events-none select-none">
            {floatingEmojis.map((item, i) => (
              <div
                key={i}
                ref={(el) => { emojiRefs.current[i] = el; }}
                className="absolute text-4xl opacity-30"
                style={{ top: item.top, left: item.left }}
              >
                {item.emoji}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-6 fade-up">
            <div className="relative flex items-center gap-3 px-6 py-3">
              {/* Corner targeting brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-neon-green"
                   style={{ animation: "bracketLockIn-tl 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both, bracketPulse 2.5s ease-in-out 1s infinite" }} />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-green"
                   style={{ animation: "bracketLockIn-tr 0.7s cubic-bezier(0.22,1,0.36,1) 0.45s both, bracketPulse 2.5s ease-in-out 1.1s infinite" }} />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-neon-green"
                   style={{ animation: "bracketLockIn-bl 0.7s cubic-bezier(0.22,1,0.36,1) 0.6s both, bracketPulse 2.5s ease-in-out 1.2s infinite" }} />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-neon-green"
                   style={{ animation: "bracketLockIn-br 0.7s cubic-bezier(0.22,1,0.36,1) 0.75s both, bracketPulse 2.5s ease-in-out 1.3s infinite" }} />

              {/* Scanline sweep */}
              <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent pointer-events-none"
                   style={{ animation: "scanlineSwipe 5s linear 1.5s infinite" }} />

              <span className="font-pixel text-neon-green text-xl">&lt;</span>
              <h1
                ref={heroTitleRef}
                className="heolab-glitch text-6xl md:text-8xl font-bold tracking-tight text-white"
                data-text="HeoLab"
              >
                HeoLab
              </h1>
              <span className="font-pixel text-neon-green text-xl">/&gt;</span>
            </div>

            <p className="text-2xl md:text-3xl font-semibold text-gray-300 tracking-wide">
              Play. Explore. Have Fun.
            </p>
            <p className="text-sm text-gray-500 max-w-sm">
              Free browser games, crafted with care. No download. No account.
            </p>

            <button
              className="mt-2 px-8 py-3 border border-neon-green text-neon-green font-pixel text-[0.6rem]
                hover:bg-neon-green hover:text-black transition-all duration-200 tracking-widest"
              onClick={(e) => {
                sounds.onClick();
                e.preventDefault();
                document.getElementById("games")?.scrollIntoView({ behavior: "smooth" });
              }}
              onMouseEnter={sounds.onMouseEnter}
            >
              PLAY NOW
            </button>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {[
                ["9", "GAMES"],
                ["FREE", "FOREVER"],
                ["0", "DOWNLOADS"],
                ["0", "ADS"],
              ].map(([num, label]) => (
                <span key={label} className="font-pixel text-[0.4rem] text-gray-600 tracking-widest">
                  <span className="text-neon-green">{num}</span> {label}
                </span>
              ))}
            </div>

            <div className="mt-6 relative flex items-center justify-center w-8 h-8">
              <div className="absolute inset-0 rounded-full border border-neon-green/40"
                style={{ animation: "pulseRing 2s ease-out infinite" }} />
              <span className="text-gray-600 text-sm">↓</span>
            </div>
          </div>
        </section>

        {/* ── GAMES SHOWCASE ────────────────────────────── */}
        <section id="games" className="py-16 px-4 max-w-6xl mx-auto">
          <h2 className="font-pixel text-neon-green text-center text-xs tracking-widest mb-8 neon-text neon-text-green">
            GAMES
          </h2>

          <div className="flex justify-center gap-2 mb-8">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`font-pixel text-[0.45rem] px-3 py-1.5 border transition-all duration-150 ${
                  activeTab === tab
                    ? "border-neon-green text-neon-green bg-neon-green/10"
                    : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((game) => (
              <Link
                key={game.href}
                href={game.href}
                className="group relative block rounded-sm bg-dark-card p-4 border transition-all duration-300 hover:-translate-y-1"
                style={{ borderColor: `${game.borderColor}33` }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${game.borderColor}99`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${game.borderColor}22`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${game.borderColor}33`;
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
              >
                <span
                  className="absolute top-2 right-2 font-pixel text-[0.4rem] px-1.5 py-0.5 border"
                  style={{ color: game.borderColor, borderColor: `${game.borderColor}55` }}
                >
                  {game.tag}
                </span>
                <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 inline-block">
                  {game.emoji}
                </div>
                <h3
                  className="font-pixel text-[0.5rem] mb-2 tracking-wider leading-relaxed"
                  style={{ color: game.borderColor }}
                >
                  {game.title}
                </h3>
                <p className="text-[0.6rem] text-gray-400 leading-relaxed hidden sm:block">
                  {game.subtitle}
                </p>
                <p
                  className="mt-3 text-[0.4rem] font-pixel opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: game.borderColor }}
                >
                  PLAY NOW →
                </p>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/games"
              className="font-pixel text-[0.5rem] text-neon-green border border-neon-green/40
                px-6 py-2 hover:border-neon-green hover:bg-neon-green/10 transition-all duration-200 tracking-widest"
            >
              VIEW ALL GAMES →
            </Link>
          </div>
        </section>

        {/* ── STATS ─────────────────────────────────────── */}
        <section className="py-16 px-4 max-w-4xl mx-auto border-t border-gray-900">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-dark-card border border-dark-border rounded-sm p-6 text-center
                  hover:border-neon-green/30 transition-colors duration-300"
              >
                <div className="text-3xl md:text-4xl font-bold text-neon-green mb-2 font-inter">
                  {s.number}
                </div>
                <div className="font-pixel text-[0.4rem] text-gray-600 tracking-widest">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ABOUT ─────────────────────────────────────── */}
        <section id="about" className="py-16 px-4 max-w-2xl mx-auto text-center border-t border-gray-900">
          <div className="text-4xl mb-6">🎮</div>
          <h2 className="text-2xl font-bold text-white mb-4">What is HeoLab?</h2>
          <p className="text-gray-400 leading-relaxed">
            HeoLab is a tiny indie game lab. We build fun, free games you can play right in your
            browser — no download, no account needed. Just pick a game and play.
          </p>
        </section>

        {/* ── ROADMAP ───────────────────────────────────── */}
        <section className="py-16 px-4 max-w-5xl mx-auto border-t border-gray-900">
          <h2 className="font-pixel text-neon-green text-center text-xs tracking-widest mb-10 neon-text neon-text-green">
            WHAT&apos;S NEXT
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {roadmap.map((item) => (
              <div
                key={item.title}
                className="bg-dark-card border border-gray-800 px-6 py-4 rounded-sm flex items-center gap-3 min-w-[180px]"
              >
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="text-white text-sm font-semibold">{item.title}</p>
                  <span className="font-pixel text-[0.4rem] text-gray-600 tracking-widest">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────── */}
        <footer className="border-t border-gray-900 py-12 px-4">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-neon-green text-xs">&lt;</span>
              <span className="font-bold text-white text-lg">HeoLab</span>
              <span className="font-pixel text-neon-green text-xs">/&gt;</span>
            </div>

            <div className="flex gap-6 font-pixel text-[0.45rem] text-gray-600">
              <Link href="/games" className="hover:text-neon-green transition-colors tracking-widest">
                PLAY GAMES
              </Link>
              <Link href="#about" className="hover:text-neon-green transition-colors tracking-widest">
                ABOUT
              </Link>
            </div>

            <div className="flex gap-5">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  title={s.href === "#" ? `${s.label} — Coming soon` : s.label}
                  aria-label={s.label}
                  className={`transition-colors duration-200 ${
                    s.href === "#"
                      ? "text-gray-700 cursor-not-allowed"
                      : "text-gray-500 hover:text-neon-green"
                  }`}
                  onClick={s.href === "#" ? (e) => e.preventDefault() : undefined}
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <p className="font-pixel text-[0.4rem] text-gray-700 tracking-widest text-center">
              © 2025 HEOLAB · ALL RIGHTS RESERVED · HEOLAB.DEV
            </p>
          </div>
        </footer>

      </main>
    </>
  );
}
