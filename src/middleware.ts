import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("Strict-Transport-Security", "max-age=63072000");

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }

  // Enable Brotli compression
  response.headers.set("Accept-Encoding", "br, gzip");

  // Add cache control
  response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
