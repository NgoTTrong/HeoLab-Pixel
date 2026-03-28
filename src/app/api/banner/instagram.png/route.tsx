import { ImageResponse } from "next/og";

export const runtime = "edge";

const W = 1080;
const H = 1080;

const DARK_BG    = "#0a0a0a";
const NEON_GREEN = "#39ff14";
const NEON_PINK  = "#ff2d95";
const NEON_BLUE  = "#00d4ff";
const NEON_YELLOW = "#ffe600";
const TEXT_COLOR = "#ffffff";
const MUTED      = "#666666";
const DOT_COLOR  = "rgba(57,255,20,0.10)";
const GAP_SM     = "18px";
const GAP_MD     = "20px";

const CORNERS = [
  { top: "24px",    left: "24px",  color: NEON_GREEN  },
  { top: "24px",    right: "24px", color: NEON_PINK   },
  { bottom: "24px", left: "24px",  color: NEON_BLUE   },
  { bottom: "24px", right: "24px", color: NEON_YELLOW },
] as const;

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            background: DARK_BG,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: GAP_SM,
            fontFamily: "sans-serif",
          }}
        >
          {/* Dot grid */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `radial-gradient(circle, ${DOT_COLOR} 1px, transparent 1px)`,
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
                top: "top" in c ? c.top : undefined,
                bottom: "bottom" in c ? c.bottom : undefined,
                left: "left" in c ? c.left : undefined,
                right: "right" in c ? c.right : undefined,
              }}
            />
          ))}

          {/* Wordmark: < HeoLab /> */}
          <div style={{ display: "flex", alignItems: "center", gap: GAP_MD }}>
            <span style={{ color: NEON_GREEN, fontSize: "64px", fontWeight: "bold" }}>{"<"}</span>
            <span style={{ color: TEXT_COLOR, fontSize: "96px", fontWeight: "bold" }}>HeoLab</span>
            <span style={{ color: NEON_GREEN, fontSize: "64px", fontWeight: "bold" }}>{"/>"}</span>
          </div>

          {/* Tagline */}
          <div style={{ color: NEON_GREEN, fontSize: "28px" }}>
            Play. Explore. Have Fun.
          </div>

          {/* Subtitle */}
          <div style={{ color: MUTED, fontSize: "18px" }}>
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
