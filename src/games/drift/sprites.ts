// src/games/drift/sprites.ts
import type { CarDef } from "./types";

// Per-car body proportions: wr = width ratio, cr = cabin ratio
const CAR_SHAPES: Record<string, { wr: number; cr: number }> = {
  striker: { wr: 1.00, cr: 0.52 },
  phantom: { wr: 1.10, cr: 0.45 },
  bolt:    { wr: 0.90, cr: 0.58 },
  tank:    { wr: 1.20, cr: 0.42 },
  ghost:   { wr: 0.86, cr: 0.50 },
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function lighten(hex: string, amt: number): string {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}

function darken(hex: string, amt: number): string {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}

function getUnderglowColor(car: CarDef, isDrifting: boolean, chargeMs: number): string {
  if (!isDrifting) return car.accentColor + "44";
  if (chargeMs < 2000) return "rgba(255,255,255,0.95)";
  if (chargeMs < 4000) return "rgba(255,230,0,0.95)";
  // Level 3: flicker orange-red
  return Math.floor(Date.now() / 80) % 2 === 0 ? "rgba(255,80,0,0.95)" : "rgba(255,140,0,0.95)";
}

/**
 * Draw a cyber racing car viewed from behind at slight downward angle.
 * x,y = screen position (y = road contact / bottom of car).
 * angle: -3..+3 for skew (0 = straight).
 * driftChargeMs: used for underglow color (default 0).
 */
export function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  angle: number,
  car: CarDef,
  isDrifting: boolean,
  driftChargeMs = 0,
): void {
  const BASE = Math.max(scale * 56, 5);
  const shapes = CAR_SHAPES[car.slug] ?? CAR_SHAPES.striker;
  const bw = BASE * 1.8 * shapes.wr;
  const bh = BASE * 0.95;
  const cabW = bw * shapes.cr;

  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, angle * 0.09, 1, 0, 0);

  // 1. Neon underglow strip
  const glowCol = getUnderglowColor(car, isDrifting, driftChargeMs);
  ctx.save();
  ctx.shadowColor = glowCol;
  ctx.shadowBlur = BASE * 1.1;
  ctx.fillStyle = glowCol;
  ctx.fillRect(-bw * 0.42, -BASE * 0.04, bw * 0.84, BASE * 0.055);
  ctx.restore();

  // 2. Rear wheels
  const ww = BASE * 0.20;
  const wh = BASE * 0.28;
  const wheelY = -bh * 0.78;
  const wo = angle * BASE * 0.035; // steer offset
  ctx.fillStyle = "#111111";
  ctx.fillRect(-bw * 0.50 - ww * 0.55 + wo, wheelY, ww, wh);
  ctx.fillRect( bw * 0.50 - ww * 0.45 + wo, wheelY, ww, wh);
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(-bw * 0.50 - ww * 0.55 + wo + 1, wheelY + 2, ww * 0.45, wh * 0.38);
  ctx.fillRect( bw * 0.50 - ww * 0.45 + wo + 1, wheelY + 2, ww * 0.45, wh * 0.38);

  // 3. Main body trapezoid (wider at bottom)
  ctx.fillStyle = car.bodyColor;
  ctx.beginPath();
  ctx.moveTo(-bw * 0.50,  0);
  ctx.lineTo( bw * 0.50,  0);
  ctx.lineTo( bw * 0.44, -bh);
  ctx.lineTo(-bw * 0.44, -bh);
  ctx.closePath();
  ctx.fill();

  // 4. Top edge highlight
  ctx.fillStyle = lighten(car.bodyColor, 45);
  ctx.fillRect(-bw * 0.42, -bh, bw * 0.84, BASE * 0.075);

  // 5. Accent racing stripe
  ctx.fillStyle = car.accentColor;
  ctx.fillRect(-bw * 0.38, -bh * 0.58, bw * 0.76, BASE * 0.10);
  // Thin highlight above stripe
  ctx.fillStyle = lighten(car.accentColor, 60);
  ctx.fillRect(-bw * 0.38, -bh * 0.58, bw * 0.76, BASE * 0.02);

  // 6. Taillights
  ctx.save();
  ctx.shadowColor = "#ff1a1a";
  ctx.shadowBlur = BASE * 0.6;
  ctx.fillStyle = "#ff3333";
  ctx.fillRect(-bw * 0.44, -bh * 0.84, BASE * 0.17, BASE * 0.12);
  ctx.fillRect( bw * 0.27, -bh * 0.84, BASE * 0.17, BASE * 0.12);
  ctx.fillStyle = "#ffaaaa";
  ctx.fillRect(-bw * 0.44 + 2, -bh * 0.84 + 2, BASE * 0.06, BASE * 0.04);
  ctx.fillRect( bw * 0.27 + 2, -bh * 0.84 + 2, BASE * 0.06, BASE * 0.04);
  ctx.restore();

  // 7. Cabin
  ctx.fillStyle = darken(car.bodyColor, 28);
  ctx.beginPath();
  ctx.moveTo(-cabW * 0.50, -bh);
  ctx.lineTo( cabW * 0.50, -bh);
  ctx.lineTo( cabW * 0.42, -bh * 1.42);
  ctx.lineTo(-cabW * 0.42, -bh * 1.42);
  ctx.closePath();
  ctx.fill();

  // 8. Rear window (dark glass)
  ctx.fillStyle = "rgba(0, 20, 40, 0.65)";
  ctx.beginPath();
  ctx.moveTo(-cabW * 0.37, -bh * 1.02);
  ctx.lineTo( cabW * 0.37, -bh * 1.02);
  ctx.lineTo( cabW * 0.30, -bh * 1.38);
  ctx.lineTo(-cabW * 0.30, -bh * 1.38);
  ctx.closePath();
  ctx.fill();
  // Glass reflection
  ctx.fillStyle = "rgba(100,180,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(-cabW * 0.37, -bh * 1.02);
  ctx.lineTo(-cabW * 0.05, -bh * 1.02);
  ctx.lineTo(-cabW * 0.05, -bh * 1.38);
  ctx.lineTo(-cabW * 0.30, -bh * 1.38);
  ctx.closePath();
  ctx.fill();

  // 9. Spoiler bar + supports
  ctx.fillStyle = car.accentColor;
  ctx.fillRect(-bw * 0.46, -bh * 1.50, bw * 0.92, BASE * 0.058);
  ctx.fillStyle = darken(car.accentColor, 20);
  ctx.fillRect(-bw * 0.35, -bh * 1.50, BASE * 0.07, BASE * 0.15);
  ctx.fillRect( bw * 0.28, -bh * 1.50, BASE * 0.07, BASE * 0.15);

  // 10. Drift sparks at high charge
  if (isDrifting && driftChargeMs > 800 && scale > 0.25) {
    drawSparks(ctx, bw, bh, angle, driftChargeMs);
  }

  ctx.restore();
}

function drawSparks(
  ctx: CanvasRenderingContext2D,
  bw: number, bh: number, angle: number, chargeMs: number,
): void {
  const count = chargeMs > 4000 ? 6 : chargeMs > 2000 ? 4 : 2;
  const side = angle >= 0 ? -bw * 0.5 : bw * 0.5;
  for (let i = 0; i < count; i++) {
    const sx = side + (Math.random() - 0.5) * bw * 0.25;
    const sy = -bh * (0.1 + Math.random() * 0.3);
    const size = 1 + Math.random() * 2.5;
    const hue = chargeMs > 4000 ? `hsl(${15 + Math.random()*20},100%,${60+Math.random()*30}%)`
              : chargeMs > 2000 ? `hsl(${45 + Math.random()*15},100%,${65+Math.random()*25}%)`
              : `hsl(0,0%,${80+Math.random()*20}%)`;
    ctx.fillStyle = hue;
    ctx.fillRect(sx, sy, size, size);
  }
}

/**
 * Smoke drawing is now handled by the particle system in DriftCanvas.tsx.
 * This stub is kept for API compatibility.
 */
export function drawSmoke(
  _ctx: CanvasRenderingContext2D,
  _x: number, _y: number, _scale: number, _intensity: number,
): void {
  // Replaced by smokeParticlesRef in DriftCanvas
}

/**
 * Draw a power-up box on the road.
 */
export function drawPowerUpBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, scale: number, color: string, emoji: string,
): void {
  if (scale < 0.05) return;
  const size = Math.max(20 * scale, 4);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.6;
  ctx.fillStyle = color + "33";
  ctx.fillRect(x - size / 2, y - size, size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, scale * 2);
  ctx.strokeRect(x - size / 2, y - size, size, size);
  ctx.restore();

  if (scale > 0.18) {
    ctx.font = `${Math.floor(size * 0.6)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x, y - size / 2);
  }
}
