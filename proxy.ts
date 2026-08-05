import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((request) => {
  const isAuthenticated = !!request.auth;
  const { pathname, search } = request.nextUrl;

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Protects every application route per roadmap section 9. Auth pages,
  // public marketing pages, and the manifest/service worker stay open.
  matcher: [
    "/dashboard/:path*",
    "/vault/:path*",
    "/expenses/:path*",
    "/budgets/:path*",
    "/subscriptions/:path*",
    "/reports/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
