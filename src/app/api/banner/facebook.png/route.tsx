import { ImageResponse } from "next/og";

export const runtime = "edge";

const W = 820;
const H = 312;

const NEON_GREEN = "#39ff14";
const TEXT_COLOR = "#ffffff";
const MUTED      = "#666666";

const GAP_SM = "10px";  // outer column gap
const GAP_MD = "14px";  // inner row gap (emoji row + wordmark row)

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
            gap: GAP_SM,
            fontFamily: "sans-serif",
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
          <div style={{ display: "flex", gap: GAP_MD, fontSize: "28px" }}>
            <span>🎮</span>
            <span>🕹️</span>
            <span>🎲</span>
          </div>

          {/* Wordmark: < HeoLab /> */}
          <div style={{ display: "flex", alignItems: "center", gap: GAP_MD }}>
            <span style={{ color: NEON_GREEN, fontSize: "36px", fontWeight: "bold" }}>{"<"}</span>
            <span style={{ color: TEXT_COLOR, fontSize: "54px", fontWeight: "bold" }}>HeoLab</span>
            <span style={{ color: NEON_GREEN, fontSize: "36px", fontWeight: "bold" }}>{"/>"}</span>
          </div>

          {/* Tagline */}
          <div style={{ color: NEON_GREEN, fontSize: "16px" }}>
            Play. Explore. Have Fun.
          </div>

          {/* Subtitle */}
          <div style={{ color: MUTED, fontSize: "13px" }}>
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
