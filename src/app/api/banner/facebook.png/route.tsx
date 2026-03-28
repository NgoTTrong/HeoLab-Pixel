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
