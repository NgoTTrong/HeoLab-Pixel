import { ImageResponse } from "next/og";

export const runtime = "edge";

const W = 1500;
const H = 500;

const DARK_BG    = "#0a0a0a";
const NEON_GREEN = "#39ff14";
const NEON_PINK  = "#ff2d95";
const NEON_BLUE  = "#00d4ff";
const NEON_PINK_BG = "rgba(255,45,149,0.15)";
const DOT_COLOR  = "rgba(57,255,20,0.10)";
const TEXT_COLOR = "#ffffff";
const GAP_SM     = "14px";
const GAP_MD     = "16px";

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
              background: `linear-gradient(to right, ${NEON_PINK}, ${NEON_BLUE})`,
            }}
          />

          {/* #HeoLab hashtag pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: NEON_PINK_BG,
              border: `1px solid ${NEON_PINK}`,
              borderRadius: "999px",
              padding: "6px 18px",
            }}
          >
            <span style={{ color: NEON_PINK, fontSize: "18px", fontWeight: "bold" }}>#HeoLab</span>
            <span style={{ fontSize: "18px" }}>🕹️</span>
          </div>

          {/* Wordmark: < HeoLab /> */}
          <div style={{ display: "flex", alignItems: "center", gap: GAP_MD }}>
            <span style={{ color: NEON_GREEN, fontSize: "52px", fontWeight: "bold" }}>{"<"}</span>
            <span style={{ color: TEXT_COLOR, fontSize: "78px", fontWeight: "bold" }}>HeoLab</span>
            <span style={{ color: NEON_GREEN, fontSize: "52px", fontWeight: "bold" }}>{"/>"}</span>
          </div>

          {/* Tagline */}
          <div style={{ color: NEON_GREEN, fontSize: "22px" }}>
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
