import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Next.js Fast Refresh/HMR needs 'unsafe-eval' in dev; production doesn't.
// script-src still needs 'unsafe-inline' because the App Router streams
// small inline bootstrap/hydration scripts in the initial HTML — a
// nonce-based CSP would remove that but requires threading a per-request
// nonce through proxy.ts into every page, which is future hardening work,
// not something to bolt on without testing every page against it.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]
  .join("; ")
  .trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Redundant with frame-ancestors above for CSP-aware browsers,
          // kept for the older ones that only honor X-Frame-Options.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
