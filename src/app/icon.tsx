import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const BG    = "#0a0a0a";
const GREEN = "#39ff14";

export default function Icon() {
  const S = 32;

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
        }}
      >
        {/* Joystick top */}
        <div
          style={{
            position: "absolute",
            background: GREEN,
            width: Math.round(S * 0.375),
            height: Math.round(S * 0.25),
            top: Math.round(S * 0.125),
            left: Math.round(S * 0.3125),
          }}
        />
        {/* Joystick stick */}
        <div
          style={{
            position: "absolute",
            background: GREEN,
            width: Math.round(S * 0.125),
            height: Math.round(S * 0.25),
            top: Math.round(S * 0.375),
            left: Math.round(S * 0.4375),
          }}
        />
        {/* Base plate */}
        <div
          style={{
            position: "absolute",
            background: GREEN,
            width: Math.round(S * 0.625),
            height: Math.round(S * 0.1875),
            top: Math.round(S * 0.625),
            left: Math.round(S * 0.1875),
          }}
        />
      </div>
    ),
    { ...size }
  );
}
