import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

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
].join("; ");

const nextConfig: NextConfig = {
  // Enables Partial Prerendering: static shell prerendered, with
  // cookie/session-dependent content wrapped in <Suspense> streamed at
  // request time instead. Piloting on the vault module first — see
  // memory: pocket-vault-deferred-phase2 for rollout status across the
  // rest of the app. This is NOT the same as `dynamic = "force-static"`,
  // which bakes the *entire* page (including auth-gated content) into one
  // shared static response — that combination caused a real bug earlier
  // in this project and must not be reintroduced.
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
