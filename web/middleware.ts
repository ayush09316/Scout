import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC = ["/signin", "/api/auth", "/api/telegram", "/opengraph-image", "/icon.svg"];

export default auth((req) => {
  if (process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true") return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (pathname === "/" || PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!req.auth) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = new URL("/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
