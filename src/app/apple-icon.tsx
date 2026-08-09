import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ikona za domači zaslon na iPhonu (brez prosojnosti, kot zahteva iOS). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1220",
          color: "#2dd4bf",
          fontSize: 108,
          fontWeight: 700,
        }}
      >
        B
      </div>
    ),
    size,
  );
}
