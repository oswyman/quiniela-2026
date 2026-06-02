import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <div
          style={{
            width: 112,
            height: 112,
            borderRadius: "50%",
            border: "4px solid #d4a642",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#d4a642",
              fontSize: 42,
              fontWeight: 900,
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            LC
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
