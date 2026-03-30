// src/games/drift/sprites.ts
import type { CarDef } from "./types";

/**
 * Draw a pixel-art car on canvas at given position.
 * angle: -3 to +3 (0 = straight, negative = left, positive = right)
 * scale: size multiplier (1 = normal, <1 = distant)
 */
export function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  angle: number,
  car: CarDef,
  isDrifting: boolean,
): void {
  const s = Math.max(scale * 40, 4); // base car size in pixels
  const w = s * 1.6;
  const h = s;

  ctx.save();
  ctx.translate(x, y);

  // Skew based on angle for drift visual
  const skew = angle * 0.08;
  ctx.transform(1, 0, skew, 1, 0, 0);

  // Car body
  ctx.fillStyle = car.bodyColor;
  roundRect(ctx, -w / 2, -h, w, h * 0.75, s * 0.1);

  // Windshield
  ctx.fillStyle = "#00000066";
  const wsW = w * 0.5;
  const wsH = h * 0.2;
  ctx.fillRect(-wsW / 2, -h * 0.8, wsW, wsH);

  // Accent stripe
  ctx.fillStyle = car.accentColor;
  ctx.fillRect(-w * 0.35, -h * 0.5, w * 0.7, h * 0.08);

  // Wheels
  ctx.fillStyle = "#1a1a1a";
  const wheelW = w * 0.15;
  const wheelH = h * 0.15;
  const wheelOffset = angle * s * 0.05;
  // Front left
  ctx.fillRect(-w / 2 - wheelW * 0.3 + wheelOffset, -h * 0.85, wheelW, wheelH);
  // Front right
  ctx.fillRect(w / 2 - wheelW * 0.7 + wheelOffset, -h * 0.85, wheelW, wheelH);
  // Rear left
  ctx.fillRect(-w / 2 - wheelW * 0.3, -h * 0.15, wheelW, wheelH);
  // Rear right
  ctx.fillRect(w / 2 - wheelW * 0.7, -h * 0.15, wheelW, wheelH);

  // Drift sparks
  if (isDrifting && scale > 0.3) {
    drawSparks(ctx, w, h, angle);
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawSparks(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, angle: number,
): void {
  const sparkCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < sparkCount; i++) {
    const sx = (angle > 0 ? -w / 2 : w / 2) + (Math.random() - 0.5) * w * 0.3;
    const sy = -h * 0.1 + Math.random() * h * 0.2;
    const size = 1 + Math.random() * 2;
    ctx.fillStyle = `hsl(${30 + Math.random() * 30}, 100%, ${70 + Math.random() * 30}%)`;
    ctx.fillRect(sx, sy, size, size);
  }
}

/**
 * Draw drift smoke particles behind a car.
 */
export function drawSmoke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  intensity: number, // 0-1
): void {
  if (scale < 0.2 || intensity <= 0) return;
  const count = Math.floor(intensity * 5);
  for (let i = 0; i < count; i++) {
    const px = x + (Math.random() - 0.5) * 20 * scale;
    const py = y + Math.random() * 10 * scale;
    const size = (3 + Math.random() * 5) * scale;
    const alpha = 0.2 + Math.random() * 0.3;
    ctx.fillStyle = `rgba(200,200,200,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw a power-up box on the road.
 */
export function drawPowerUpBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  emoji: string,
): void {
  if (scale < 0.05) return;
  const size = Math.max(20 * scale, 4);

  // Glowing box
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = color + "44";
  ctx.fillRect(x - size / 2, y - size, size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, scale * 2);
  ctx.strokeRect(x - size / 2, y - size, size, size);
  ctx.shadowBlur = 0;

  // Emoji (only if big enough)
  if (scale > 0.2) {
    ctx.font = `${Math.floor(size * 0.6)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x, y - size / 2);
  }
}
