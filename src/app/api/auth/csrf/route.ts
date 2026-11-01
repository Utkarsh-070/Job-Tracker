import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { CSRF_COOKIE, sessionCookieOptions } from "@/lib/firebase/policy";

export function GET() {
  const csrfToken = randomBytes(32).toString("hex");
  const response = NextResponse.json(
    { csrfToken },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(CSRF_COOKIE, csrfToken, {
    ...sessionCookieOptions,
    maxAge: 600,
    path: "/api/auth/session",
  });
  return response;
}
