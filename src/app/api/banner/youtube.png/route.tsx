import { ImageResponse } from "next/og";

export const runtime = "edge";

const W = 2560;
const H = 1440;

const DARK_BG    = "#0a0a0a";
const NEON_GREEN = "#39ff14";
const TEXT_COLOR = "#ffffff";
const MUTED      = "#666666";
const GAP_LG     = "48px";
const GAP_MD     = "28px";
const GAP_SM     = "20px";

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
              backgroundImage:
                "radial-gradient(circle, rgba(57,255,20,0.08) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Wordmark row: pixel play button + < HeoLab /> */}
          <div style={{ display: "flex", alignItems: "center", gap: GAP_LG }}>
            {/* Pixel play button */}
            <div
              style={{
                width: "90px",
                height: "90px",
                background: NEON_GREEN,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
              }}
            >
              <span style={{ fontSize: "52px", color: DARK_BG, marginLeft: "8px" }}>▶</span>
            </div>

            {/* < HeoLab /> */}
            <div style={{ display: "flex", alignItems: "center", gap: GAP_MD }}>
              <span style={{ color: NEON_GREEN, fontSize: "100px", fontWeight: "bold" }}>{"<"}</span>
              <span style={{ color: TEXT_COLOR, fontSize: "150px", fontWeight: "bold" }}>HeoLab</span>
              <span style={{ color: NEON_GREEN, fontSize: "100px", fontWeight: "bold" }}>{"/>"}</span>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ color: NEON_GREEN, fontSize: "56px" }}>
            Play. Explore. Have Fun.
          </div>

          {/* Subtitle */}
          <div style={{ color: MUTED, fontSize: "40px" }}>
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
