import type { DecodedIdToken } from "firebase-admin/auth";

export const SESSION_COOKIE = "jt_session";
export const SESSION_SECONDS = 14 * 24 * 60 * 60;
export const CSRF_COOKIE = "jt_login_csrf";

export function isGoogleIdentity(claims: DecodedIdToken): boolean {
  return (
    claims.firebase?.sign_in_provider === "google.com" &&
    claims.email_verified === true &&
    typeof claims.email === "string" &&
    claims.email.length > 0 &&
    claims.email.length <= 320 &&
    typeof claims.uid === "string" &&
    claims.uid.length > 0 &&
    claims.uid.length <= 128
  );
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL?.trim() || new URL(request.url).origin;
  try {
    return (
      Boolean(origin) &&
      new URL(origin!).origin === new URL(expected).origin &&
      !["cross-site", "none"].includes(
        request.headers.get("sec-fetch-site") || "",
      )
    );
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_SECONDS,
  path: "/",
};
