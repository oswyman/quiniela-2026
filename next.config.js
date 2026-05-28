/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com accounts.google.com apis.google.com vercel.live *.vercel.live"
      : "script-src 'self' 'unsafe-inline' *.googleapis.com *.gstatic.com accounts.google.com apis.google.com vercel.live *.vercel.live";

    // In dev, also include emulator hosts in connect-src
    const connectSrc = isDev
      ? "connect-src 'self' *.firebaseio.com *.googleapis.com *.cloudfunctions.net wss://*.firebaseio.com accounts.google.com apis.google.com *.vercel.live http://localhost:* ws://localhost:*"
      : "connect-src 'self' *.firebaseio.com *.googleapis.com *.cloudfunctions.net wss://*.firebaseio.com accounts.google.com apis.google.com *.vercel.live";

    // Google Sign-In popup requires frames from accounts.google.com and firebaseapp.com
    const frameSrc = "frame-src accounts.google.com apis.google.com *.firebaseapp.com *.vercel.live";

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              connectSrc,
              frameSrc,
              "img-src 'self' data: https:",
              "font-src 'self' fonts.gstatic.com data:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join("; ")
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
