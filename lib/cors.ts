import { NextResponse } from "next/server"

import { env } from "@/lib/env"

// Only for the native-app's endpoints (app/api/sync/*, app/api/auth/token)
// — the Tauri webview calls these from a different origin than this
// Next.js app (http://localhost:1420 in dev, a tauri://-style origin in a
// built desktop/Android app), which the browser/webview's CORS check would
// otherwise block. proxy.ts never runs on /api/*, so each of these route
// files is responsible for its own CORS headers — see requireBearerUser
// for the equivalent note about auth.
//
// A wildcard origin is an acceptable default *specifically here* because
// these endpoints are bearer-token authenticated, not cookie-authenticated
// (see lib/auth/require-bearer-user.ts). CORS exists to stop a malicious
// site from riding along on a browser's ambient cookies; there's no
// ambient credential to ride along on when the token has to be explicitly
// attached by code that already possesses it. Set NATIVE_APP_CORS_ORIGIN
// to a specific origin if you'd rather lock this down once you know your
// production Tauri origin string(s).
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": env.NATIVE_APP_CORS_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
}

export function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

// A POST with a JSON body and/or an Authorization header triggers a
// browser/webview CORS preflight (OPTIONS) before the real request — every
// route using withCors must also export this as its OPTIONS handler.
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
