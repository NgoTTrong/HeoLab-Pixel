import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const BG    = "#0a0a0a";
const GREEN = "#39ff14";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: BG,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontSize: 14,
          fontWeight: "bold",
          color: GREEN,
        }}
      >
        {"</>"}
      </div>
    ),
    { ...size }
  );
}
