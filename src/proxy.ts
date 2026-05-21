import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

const PUBLIC_PATHS = ["/", "/api/auth/send-otp", "/api/auth/verify-otp"];
const ADMIN_PATHS = ["/admin", "/api/admin"];

export default async function (request: NextRequest) {
  const { pathname } = request.nextUrl;

  // السماح بالمسارات العامة والملفات الثابتة
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".map")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("mawaddah_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // حماية مسارات الأدمن
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!session.isAdmin) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
