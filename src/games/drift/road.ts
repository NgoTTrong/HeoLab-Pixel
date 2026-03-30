// src/games/drift/road.ts
import type { Segment, TrackPalette } from "./types";
import { SEGMENT_LENGTH, ROAD_WIDTH, VISIBLE_SEGMENTS, CAMERA_HEIGHT, CAMERA_DEPTH } from "./config";

/**
 * Project world segments to screen coordinates based on camera position.
 * Mutates segment.screen in-place for performance.
 */
export function projectSegments(
  segments: Segment[],
  cameraZ: number,
  cameraX: number,
  canvasW: number,
  canvasH: number,
): void {
  let curveAccum = 0;
  let hillAccum = 0;

  for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
    const idx = (Math.floor(cameraZ / SEGMENT_LENGTH) + i) % segments.length;
    const seg = segments[idx];
    const worldZ = (i + 1) * SEGMENT_LENGTH - (cameraZ % SEGMENT_LENGTH);

    if (worldZ <= 0) {
      seg.screen = { x: 0, y: 0, w: 0, scale: 0 };
      continue;
    }

    const scale = CAMERA_DEPTH / worldZ;
    const projX = canvasW / 2 + (scale * (-cameraX * ROAD_WIDTH + curveAccum) * canvasW / 2);
    const projY = canvasH / 2 - (scale * (CAMERA_HEIGHT + hillAccum) * canvasH / 2);
    const projW = scale * ROAD_WIDTH * canvasW / 2;

    seg.screen = { x: projX, y: projY, w: projW, scale };
    curveAccum += seg.curve * SEGMENT_LENGTH;
    hillAccum += seg.hill * SEGMENT_LENGTH;
  }
}

/**
 * Render the sky gradient.
 */
export function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  palette: TrackPalette,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h / 2);
  grad.addColorStop(0, palette.sky1);
  grad.addColorStop(1, palette.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h / 2);
}

/**
 * Render road segments from back to front.
 */
export function drawRoad(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  cameraZ: number,
  w: number,
  h: number,
  palette: TrackPalette,
): void {
  // Draw from farthest to nearest
  for (let i = VISIBLE_SEGMENTS - 1; i > 0; i--) {
    const idx = (Math.floor(cameraZ / SEGMENT_LENGTH) + i) % segments.length;
    const prevIdx = (Math.floor(cameraZ / SEGMENT_LENGTH) + i - 1) % segments.length;
    if (prevIdx < 0) continue;

    const seg = segments[idx];
    const prevSeg = segments[prevIdx >= 0 ? prevIdx : prevIdx + segments.length];

    if (!seg.screen || !prevSeg.screen || seg.screen.scale <= 0) continue;

    const s1 = seg.screen;
    const s2 = prevSeg.screen;

    // Skip if behind camera or above screen
    if (s1.y >= s2.y) continue;

    const isEven = (Math.floor(cameraZ / SEGMENT_LENGTH) + i) % 2 === 0;

    // Ground/grass
    ctx.fillStyle = isEven ? palette.grass1 : palette.grass2;
    ctx.fillRect(0, s1.y, w, s2.y - s1.y);

    // Road surface
    const roadColor = isEven ? palette.road1 : palette.road2;
    drawTrapezoid(ctx, s1.x, s1.y, s1.w, s2.x, s2.y, s2.w, roadColor);

    // Rumble strips (edge markers)
    const rumbleW1 = s1.w * 1.15;
    const rumbleW2 = s2.w * 1.15;
    const rumbleColor = isEven ? palette.rumble1 : palette.rumble2;
    drawTrapezoid(ctx, s1.x, s1.y, rumbleW1, s2.x, s2.y, rumbleW2, rumbleColor);
    // Re-draw road on top of rumble
    drawTrapezoid(ctx, s1.x, s1.y, s1.w, s2.x, s2.y, s2.w, roadColor);

    // Lane markings (center dashes)
    if (isEven) {
      const laneW1 = s1.w * 0.02;
      const laneW2 = s2.w * 0.02;
      drawTrapezoid(ctx, s1.x, s1.y, laneW1, s2.x, s2.y, laneW2, palette.lane);
    }
  }
}

/** Draw a filled trapezoid between two horizontal lines */
function drawTrapezoid(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, w1: number,
  x2: number, y2: number, w2: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x1 + w1, y1);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x2 - w2, y2);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a simple parallax background layer.
 * offset: 0-1 horizontal scroll position
 * yBase: bottom Y of this layer
 */
export function drawParallax(
  ctx: CanvasRenderingContext2D,
  w: number,
  yBase: number,
  height: number,
  offset: number,
  color: string,
  pattern: "buildings" | "mountains" | "cacti" | "grid",
): void {
  ctx.fillStyle = color;
  const ox = (offset * w) % w;

  if (pattern === "buildings" || pattern === "grid") {
    // Simple silhouette buildings/towers
    for (let i = 0; i < 12; i++) {
      const bx = ((i * w / 8) - ox + w * 2) % (w * 2) - w / 2;
      const bw = 20 + (i * 17) % 30;
      const bh = 30 + (i * 23) % (height * 0.7);
      ctx.fillRect(bx, yBase - bh, bw, bh);
      // Window dots
      if (pattern === "grid") {
        ctx.fillStyle = "#00d4ff33";
        for (let wy = yBase - bh + 5; wy < yBase - 5; wy += 8) {
          for (let wx = bx + 4; wx < bx + bw - 4; wx += 6) {
            ctx.fillRect(wx, wy, 2, 2);
          }
        }
        ctx.fillStyle = color;
      }
    }
  } else if (pattern === "mountains") {
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= w; x += 20) {
      const nx = (x - ox + w) % w;
      const mh = (Math.sin(nx * 0.01) * 0.5 + Math.sin(nx * 0.023) * 0.3 + 0.2) * height;
      ctx.lineTo(x, yBase - mh);
    }
    ctx.lineTo(w, yBase);
    ctx.closePath();
    ctx.fill();
  } else if (pattern === "cacti") {
    for (let i = 0; i < 8; i++) {
      const cx = ((i * w / 6) - ox + w * 2) % (w * 2) - w / 4;
      const ch = 15 + (i * 19) % 25;
      // Simple cactus shape
      ctx.fillRect(cx, yBase - ch, 4, ch);
      ctx.fillRect(cx - 6, yBase - ch * 0.7, 6, 3);
      ctx.fillRect(cx + 4, yBase - ch * 0.5, 6, 3);
    }
  }
}
