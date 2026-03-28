import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HeoLab — Play Free Browser Games";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
          gap: "24px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Dot grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(57,255,20,0.1) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#39ff14", fontSize: "48px" }}>&lt;</span>
          <span style={{ fontSize: "96px", fontWeight: "bold", color: "white" }}>
            HeoLab
          </span>
          <span style={{ color: "#39ff14", fontSize: "48px" }}>/&gt;</span>
        </div>
        {/* Tagline */}
        <div style={{ fontSize: "36px", color: "#39ff14" }}>
          Play. Explore. Have Fun.
        </div>
        {/* Sub */}
        <div style={{ fontSize: "22px", color: "#666" }}>
          Free browser games · heolab.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
