import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(145deg, #10392d 0%, #0a1a11 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "22%",
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: "50%",
            border: "10px solid #d4a642",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Inner pentagon patch */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                color: "#d4a642",
                fontSize: 110,
                fontWeight: 900,
                fontFamily: "system-ui, -apple-system, sans-serif",
                letterSpacing: -6,
                lineHeight: 1,
              }}
            >
              LC
            </span>
            <span
              style={{
                color: "rgba(246, 223, 156, 0.7)",
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: 6,
                textTransform: "uppercase",
              }}
            >
              2026
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
