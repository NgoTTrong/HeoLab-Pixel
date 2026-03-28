import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BG = "#0a0a0a";

export default function AppleIcon() {
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
          fontSize: 130,
        }}
      >
        🕹️
      </div>
    ),
    { ...size }
  );
}
