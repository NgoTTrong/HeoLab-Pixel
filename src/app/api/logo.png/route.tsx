import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const ALLOWED_SIZES = [256, 512, 1024] as const;
type AllowedSize = (typeof ALLOWED_SIZES)[number];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const sizeParam = Number(searchParams.get("size") ?? "512");
    const size: AllowedSize = (ALLOWED_SIZES as readonly number[]).includes(sizeParam)
      ? (sizeParam as AllowedSize)
      : 512;

    const variant = searchParams.get("variant") === "light" ? "light" : "dark";
    const isDark = variant === "dark";

    // Scale all sizes proportionally from 512px base
    const scale = size / 512;
    const bracketSize = Math.round(48 * scale);
    const textSize    = Math.round(72 * scale);
    const taglineSize = Math.round(18 * scale);
    const gap         = Math.round(16 * scale);
    const dotSpacing  = Math.round(24 * scale);

    const bg         = isDark ? "#0a0a0a" : "#f5f5f5";
    const textColor  = isDark ? "#ffffff" : "#0a0a0a";
    const neonGreen  = "#39ff14";

    return new ImageResponse(
      (
        <div
          style={{
            background: bg,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: `${gap}px`,
            fontFamily: "sans-serif",
          }}
        >
          {/* Dot grid overlay (dark variant only) */}
          {isDark && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `radial-gradient(circle, rgba(57,255,20,0.12) 1px, transparent 1px)`,
                backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
              }}
            />
          )}

          {/* Logo mark: < HeoLab /> */}
          <div style={{ display: "flex", alignItems: "center", gap: `${gap}px` }}>
            <span style={{ color: neonGreen, fontSize: `${bracketSize}px`, fontWeight: "bold" }}>
              {"<"}
            </span>
            <span style={{ color: textColor, fontSize: `${textSize}px`, fontWeight: "bold" }}>
              HeoLab
            </span>
            <span style={{ color: neonGreen, fontSize: `${bracketSize}px`, fontWeight: "bold" }}>
              {"/>"}
            </span>
          </div>

          {/* Tagline */}
          <div style={{ color: neonGreen, fontSize: `${taglineSize}px` }}>
            Play. Explore. Have Fun.
          </div>
        </div>
      ),
      { width: size, height: size }
    );
  } catch {
    return new Response("Failed to generate logo", { status: 500 });
  }
}
