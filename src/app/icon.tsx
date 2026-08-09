import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Ikona aplikacije: monogram lokala v barvah vmesnika. */
export default function Icon() {
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
          fontSize: 300,
          fontWeight: 700,
          letterSpacing: -12,
        }}
      >
        B
      </div>
    ),
    size,
  );
}
