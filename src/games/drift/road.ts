// src/games/drift/road.ts
import type { Segment, TrackPalette } from "./types";
import { SEGMENT_LENGTH, VISIBLE_SEGMENTS } from "./config";

/**
 * Project world segments to screen coordinates based on camera position.
 * Uses normalized segment-unit distances for correct pseudo-3D perspective.
 * Mutates segment.screen in-place for performance.
 */
export function projectSegments(
  segments: Segment[],
  cameraZ: number,
  cameraX: number,
  canvasW: number,
  canvasH: number,
): void {
  const segIdx = Math.floor(cameraZ / SEGMENT_LENGTH);
  const segFrac = (cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const halfW = canvasW / 2;
  const horizonY = canvasH * 0.4;
  const roadDepthY = canvasH * 0.6;

  let x = 0;    // accumulated horizontal curve offset (normalised)
  let dx = 0;   // curve velocity
  let hillAccum = 0;

  for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
    const rawIdx = segIdx + i;
    const idx = ((rawIdx % segments.length) + segments.length) % segments.length;
    const seg = segments[idx];

    // Distance in segment units (1 = nearest visible segment)
    const dist = i + 1 - segFrac;

    if (dist <= 0.01) {
      seg.screen = { x: 0, y: canvasH, w: 0, scale: 0 };
      continue;
    }

    const scale = 1 / dist;

    const projX = halfW + (x - cameraX * scale * 2) * halfW;
    const projY = Math.min(canvasH, horizonY + scale * roadDepthY - hillAccum * scale * canvasH * 0.3);
    const projW = scale * halfW * 0.4;

    seg.screen = { x: projX, y: projY, w: projW, scale };

    x += dx;
    dx += seg.curve * 0.003;
    hillAccum += seg.hill * 0.02;
  }
}

const NIGHT_TRACKS = new Set(["city", "cyber"]);

/**
 * Render the sky gradient.
 */
export function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  palette: TrackPalette,
  scenery: string,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h * 0.42);
  grad.addColorStop(0,   palette.sky1);
  grad.addColorStop(0.6, palette.sky2);
  grad.addColorStop(1,   palette.fog);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.42);

  if (NIGHT_TRACKS.has(scenery)) {
    const PHI = 1.6180339887;
    for (let i = 0; i < 55; i++) {
      const sx = ((i * PHI * 97.3) % 1) * w;
      const sy = ((i * PHI * 53.1) % 1) * h * 0.36;
      const sz = i % 3 === 0 ? 1.5 : 1;
      const alpha = 0.35 + (i % 5) * 0.10;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(sx, sy, sz, sz);
    }
  }
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
  const segIdx = Math.floor(cameraZ / SEGMENT_LENGTH);
  const segCount = segments.length;

  ctx.fillStyle = palette.grass1;
  ctx.fillRect(0, h * 0.4, w, h * 0.6);

  for (let i = VISIBLE_SEGMENTS - 1; i > 0; i--) {
    const rawIdx = segIdx + i;
    const idx     = ((rawIdx     % segCount) + segCount) % segCount;
    const prevIdx = (((rawIdx-1) % segCount) + segCount) % segCount;

    const seg     = segments[idx];
    const prevSeg = segments[prevIdx];

    if (!seg.screen || !prevSeg.screen || seg.screen.scale <= 0) continue;
    const s1 = seg.screen;
    const s2 = prevSeg.screen;
    if (s1.y >= s2.y) continue;

    const isEven = rawIdx % 2 === 0;
    const stripH = Math.ceil(s2.y - s1.y) + 1;

    // Ground strip
    ctx.fillStyle = isEven ? palette.grass1 : palette.grass2;
    ctx.fillRect(0, Math.floor(s1.y), w, stripH);

    // Rumble strips
    drawTrapezoid(ctx, s1.x, s1.y, s1.w * 1.25, s2.x, s2.y, s2.w * 1.25,
      isEven ? palette.rumble1 : palette.rumble2);

    // Road surface
    drawTrapezoid(ctx, s1.x, s1.y, s1.w, s2.x, s2.y, s2.w,
      isEven ? palette.road1 : palette.road2);

    // Lane center markings (dashed)
    if (isEven) {
      const lw1 = s1.w * 0.03;
      const lw2 = s2.w * 0.03;
      drawTrapezoid(ctx, s1.x, s1.y, lw1, s2.x, s2.y, lw2, palette.lane);
    }

    // Shoulder lines (solid, both sides)
    const sw1 = s1.w * 0.01;
    const sw2 = s2.w * 0.01;
    const so1 = s1.w * 0.92;
    const so2 = s2.w * 0.92;
    drawTrapezoid(ctx, s1.x - so1, s1.y, sw1, s2.x - so2, s2.y, sw2, palette.lane);
    drawTrapezoid(ctx, s1.x + so1, s1.y, sw1, s2.x + so2, s2.y, sw2, palette.lane);
  }

  // Depth fog overlay near horizon
  const fogGrad = ctx.createLinearGradient(0, h * 0.38, 0, h * 0.58);
  fogGrad.addColorStop(0, palette.fog + "cc");
  fogGrad.addColorStop(1, palette.fog + "00");
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, h * 0.38, w, h * 0.20);
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
 * Draw roadside scenery objects scaled by distance.
 * Called after road, before cars in the draw order.
 */
export function drawScenery(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  cameraZ: number,
  w: number,
  h: number,
  scenery: "city" | "mountain" | "desert" | "cyber",
): void {
  const segIdx = Math.floor(cameraZ / SEGMENT_LENGTH);
  const segCount = segments.length;
  const OBJECT_INTERVAL = 15;

  for (let i = VISIBLE_SEGMENTS - 2; i > 2; i--) {
    const rawIdx = segIdx + i;
    if (rawIdx % OBJECT_INTERVAL !== 0) continue;

    const idx = ((rawIdx % segCount) + segCount) % segCount;
    const seg = segments[idx];
    if (!seg.screen || seg.screen.scale <= 0) continue;

    const s = seg.screen;
    const objScale = s.scale;
    if (objScale < 0.03) continue;

    const side = (Math.floor(rawIdx / OBJECT_INTERVAL)) % 2 === 0 ? -1 : 1;
    const objX = s.x + side * (s.w * 1.55);

    ctx.save();
    ctx.translate(objX, s.y);

    switch (scenery) {
      case "city":     drawBuilding(ctx, objScale, side, rawIdx);    break;
      case "mountain": drawTree(ctx, objScale, rawIdx);              break;
      case "desert":   drawCactus(ctx, objScale, rawIdx);            break;
      case "cyber":    drawCyberPillar(ctx, objScale, rawIdx);       break;
    }
    ctx.restore();
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, scale: number, side: number, seed: number): void {
  const bw = (30 + (seed * 17) % 25) * scale;
  const bh = (40 + (seed * 23) % 50) * scale;
  ctx.fillStyle = `hsl(${240 + (seed % 30)}, 30%, 15%)`;
  ctx.fillRect(side > 0 ? 0 : -bw, -bh, bw, bh);
  ctx.fillStyle = `rgba(${seed%2===0?249:0},${seed%3===0?115:212},${seed%2===0?22:255},0.7)`;
  const cols = Math.max(2, Math.round(bw / (6 * scale)));
  const rows = Math.max(2, Math.round(bh / (8 * scale)));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c + seed) % 3 !== 0) continue;
      const wx = (side > 0 ? 0 : -bw) + (c + 0.5) * (bw / cols);
      const wy = -bh + (r + 0.5) * (bh / rows);
      ctx.fillRect(wx - scale, wy - scale, scale * 2, scale * 2);
    }
  }
}

function drawTree(ctx: CanvasRenderingContext2D, scale: number, seed: number): void {
  const th = (25 + (seed * 19) % 20) * scale;
  const tw = th * 0.7;
  ctx.fillStyle = "#3d2b1f";
  ctx.fillRect(-scale * 1.5, 0, scale * 3, -th * 0.3);
  ctx.fillStyle = "#1a3a1a";
  ctx.beginPath();
  ctx.moveTo(0, -th);
  ctx.lineTo(-tw * 0.5, -th * 0.55);
  ctx.lineTo(tw * 0.5, -th * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#153015";
  ctx.beginPath();
  ctx.moveTo(0, -th * 0.75);
  ctx.lineTo(-tw * 0.6, -th * 0.3);
  ctx.lineTo(tw * 0.6, -th * 0.3);
  ctx.closePath();
  ctx.fill();
}

function drawCactus(ctx: CanvasRenderingContext2D, scale: number, seed: number): void {
  const ch = (20 + (seed * 13) % 18) * scale;
  const cw = scale * 3;
  ctx.fillStyle = "#4a7c3f";
  ctx.fillRect(-cw / 2, -ch, cw, ch);
  ctx.fillRect(-cw * 3, -ch * 0.65, cw * 2.5, cw);
  ctx.fillRect(-cw * 3, -ch * 0.85, cw, ch * 0.25);
  ctx.fillRect(cw / 2, -ch * 0.5, cw * 2.5, cw);
  ctx.fillRect(cw * 2.5, -ch * 0.7, cw, ch * 0.25);
}

function drawCyberPillar(ctx: CanvasRenderingContext2D, scale: number, seed: number): void {
  const ph = (35 + (seed * 11) % 25) * scale;
  const pw = scale * 4;
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(-pw / 2, -ph, pw, ph);
  ctx.fillStyle = seed % 2 === 0 ? "#00d4ff" : "#f97316";
  ctx.fillRect(-pw / 2, -ph, pw * 0.3, ph);
  ctx.save();
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = scale * 8;
  ctx.fillRect(-pw / 2, -ph, pw * 0.3, ph);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -ph, scale * 2, 0, Math.PI * 2);
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
