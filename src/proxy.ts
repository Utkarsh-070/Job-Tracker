import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/firebase/policy";
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === "/login" ||
    pathname === "/auth/extension" ||
    pathname.startsWith("/api/") ||
    (process.env.NODE_ENV === "development" && pathname === "/preview")
  )
    return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value)
    return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|fonts/).*)"],
};
