# HeoLab Social Media Banners Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create 4 Next.js Edge API routes that generate PNG social media banners for Facebook, YouTube, TikTok, and Instagram.

**Architecture:** Each route is a standalone `route.tsx` file using `ImageResponse` from `next/og` with Edge runtime — same pattern as `src/app/api/logo.png/route.tsx`. Shared design: dark bg + dot grid + `< HeoLab />` wordmark + tagline. Each platform adds small decorative elements. No query params — fixed size per platform.

**Tech Stack:** Next.js 16 App Router, `next/og` ImageResponse, Edge runtime, TypeScript

---

### Task 1: Facebook Page Cover banner

**Files:**
- Create: `src/app/api/banner/facebook.png/route.tsx`

**Step 1: Create the file**

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

const W = 820;
const H = 312;

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#0a0a0a",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          {/* Dot grid */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(57,255,20,0.10) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Game emoji row */}
          <div style={{ display: "flex", gap: "14px", fontSize: "28px" }}>
            <span>🎮</span>
            <span>🕹️</span>
            <span>🎲</span>
          </div>

          {/* Wordmark: < HeoLab /> */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "#39ff14", fontSize: "36px", fontWeight: "bold" }}>{"<"}</span>
            <span style={{ color: "#ffffff", fontSize: "54px", fontWeight: "bold" }}>HeoLab</span>
            <span style={{ color: "#39ff14", fontSize: "36px", fontWeight: "bold" }}>{"/>"}</span>
          </div>

          {/* Tagline */}
          <div style={{ color: "#39ff14", fontSize: "16px" }}>
            Play. Explore. Have Fun.
          </div>

          {/* Subtitle */}
          <div style={{ color: "#666666", fontSize: "13px" }}>
            Free Browser Games · heolab.dev
          </div>
        </div>
      ),
      { width: W, height: H }
    );
  } catch {
    return new Response("Failed to generate banner", { status: 500 });
  }
}
```

**Step 2: TypeScript check**

```bash
cd E:\Personal\GameStation && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Verify in browser**

Open `http://localhost:3000/api/banner/facebook.png` — should show 820×312 dark banner with emoji row + wordmark + tagline + subtitle.

**Step 4: Commit**

```bash
git add src/app/api/banner/facebook.png/route.tsx
git commit -m "feat: add Facebook Page cover banner route (820x312)"
```

---

### Task 2: YouTube Channel Art banner

**Files:**
- Create: `src/app/api/banner/youtube.png/route.tsx`

**Step 1: Create the file**

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

const W = 2560;
const H = 1440;

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#0a0a0a",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "28px",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          {/* Dot grid */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(57,255,20,0.08) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Wordmark row: ▶ pixel play button + < HeoLab /> */}
          <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
            {/* Pixel play button */}
            <div
              style={{
                width: "90px",
                height: "90px",
                background: "#39ff14",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
              }}
            >
              <span style={{ fontSize: "52px", color: "#0a0a0a", marginLeft: "8px" }}>▶</span>
            </div>

            {/* < HeoLab /> */}
            <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
              <span style={{ color: "#39ff14", fontSize: "100px", fontWeight: "bold" }}>{"<"}</span>
              <span style={{ color: "#ffffff", fontSize: "150px", fontWeight: "bold" }}>HeoLab</span>
              <span style={{ color: "#39ff14", fontSize: "100px", fontWeight: "bold" }}>{"/>"}</span>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ color: "#39ff14", fontSize: "56px" }}>
            Play. Explore. Have Fun.
          </div>

          {/* Subtitle */}
          <div style={{ color: "#666666", fontSize: "40px" }}>
            Watch · Play · Explore · heolab.dev
          </div>
        </div>
      ),
      { width: W, height: H }
    );
  } catch {
    return new Response("Failed to generate banner", { status: 500 });
  }
}
```

**Step 2: TypeScript check**

```bash
cd E:\Personal\GameStation && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Verify in browser**

Open `http://localhost:3000/api/banner/youtube.png` — should show 2560×1440 banner with play button + wordmark centered, all content clearly readable in center safe zone.

**Step 4: Commit**

```bash
git add src/app/api/banner/youtube.png/route.tsx
git commit -m "feat: add YouTube channel art banner route (2560x1440)"
```

---

### Task 3: TikTok Profile Banner

**Files:**
- Create: `src/app/api/banner/tiktok.png/route.tsx`

**Step 1: Create the file**

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

const W = 1500;
const H = 500;

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#0a0a0a",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          {/* Dot grid */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(57,255,20,0.10) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Top gradient border strip */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "5px",
              background: "linear-gradient(to right, #ff2d95, #00d4ff)",
            }}
          />

          {/* #HeoLab hashtag pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,45,149,0.15)",
              border: "1px solid #ff2d95",
              borderRadius: "999px",
              padding: "6px 18px",
            }}
          >
            <span style={{ color: "#ff2d95", fontSize: "18px", fontWeight: "bold" }}>#HeoLab</span>
            <span style={{ fontSize: "18px" }}>🕹️</span>
          </div>

          {/* Wordmark: < HeoLab /> */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ color: "#39ff14", fontSize: "52px", fontWeight: "bold" }}>{"<"}</span>
            <span style={{ color: "#ffffff", fontSize: "78px", fontWeight: "bold" }}>HeoLab</span>
            <span style={{ color: "#39ff14", fontSize: "52px", fontWeight: "bold" }}>{"/>"}</span>
          </div>

          {/* Tagline */}
          <div style={{ color: "#39ff14", fontSize: "22px" }}>
            Play. Explore. Have Fun.
          </div>
        </div>
      ),
      { width: W, height: H }
    );
  } catch {
    return new Response("Failed to generate banner", { status: 500 });
  }
}
```

**Step 2: TypeScript check**

```bash
cd E:\Personal\GameStation && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Verify in browser**

Open `http://localhost:3000/api/banner/tiktok.png` — should show 1500×500 banner with pink-blue top strip, `#HeoLab` pill, wordmark, tagline.

**Step 4: Commit**

```bash
git add src/app/api/banner/tiktok.png/route.tsx
git commit -m "feat: add TikTok profile banner route (1500x500)"
```

---

### Task 4: Instagram Square Banner

**Files:**
- Create: `src/app/api/banner/instagram.png/route.tsx`

**Step 1: Create the file**

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

const W = 1080;
const H = 1080;

// Corner pixel squares — one per corner, each a different neon color
const CORNERS = [
  { top: "24px",  left: "24px",  color: "#39ff14" }, // top-left    green
  { top: "24px",  right: "24px", color: "#ff2d95" }, // top-right   pink
  { bottom: "24px", left: "24px",  color: "#00d4ff" }, // bottom-left blue
  { bottom: "24px", right: "24px", color: "#ffe600" }, // bottom-right yellow
] as const;

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#0a0a0a",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          {/* Dot grid */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(57,255,20,0.10) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          {/* Corner pixel squares */}
          {CORNERS.map((c, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "40px",
                height: "40px",
                background: c.color,
                boxShadow: `0 0 12px ${c.color}`,
                ...c,
              }}
            />
          ))}

          {/* Wordmark: < HeoLab /> */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <span style={{ color: "#39ff14", fontSize: "64px", fontWeight: "bold" }}>{"<"}</span>
            <span style={{ color: "#ffffff", fontSize: "96px", fontWeight: "bold" }}>HeoLab</span>
            <span style={{ color: "#39ff14", fontSize: "64px", fontWeight: "bold" }}>{"/>"}</span>
          </div>

          {/* Tagline */}
          <div style={{ color: "#39ff14", fontSize: "28px" }}>
            Play. Explore. Have Fun.
          </div>

          {/* Subtitle */}
          <div style={{ color: "#666666", fontSize: "18px" }}>
            Play in your browser · heolab.dev
          </div>
        </div>
      ),
      { width: W, height: H }
    );
  } catch {
    return new Response("Failed to generate banner", { status: 500 });
  }
}
```

**Step 2: TypeScript check**

```bash
cd E:\Personal\GameStation && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Verify in browser**

Open `http://localhost:3000/api/banner/instagram.png` — should show 1080×1080 square banner with 4 neon corner squares, wordmark, tagline, subtitle.

**Step 4: Commit**

```bash
git add src/app/api/banner/instagram.png/route.tsx
git commit -m "feat: add Instagram square banner route (1080x1080)"
```
