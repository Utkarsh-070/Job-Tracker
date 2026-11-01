import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  firebaseAdminAuth,
  AuthConfigurationError,
} from "@/lib/firebase/admin";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  SESSION_SECONDS,
  sessionCookieOptions,
  isSameOrigin,
  isGoogleIdentity,
} from "@/lib/firebase/policy";
import { provisionGoogleUser } from "@/lib/firebase/users";
import { readJson, RequestError } from "@/lib/request";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Open the tracker to sign in." },
      { status: 403 },
    );
  try {
    const body = await readJson(request, 16000);
    const cookie = request.cookies.get(CSRF_COOKIE)?.value;
    if (
      typeof body.csrfToken !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.csrfToken) ||
      !cookie ||
      !/^[a-f0-9]{64}$/.test(cookie) ||
      !timingSafeEqual(Buffer.from(cookie), Buffer.from(body.csrfToken))
    )
      return NextResponse.json(
        { error: "This sign-in request expired. Please try again." },
        { status: 403 },
      );
    if (typeof body.idToken !== "string" || body.idToken.length > 12000)
      throw new RequestError(
        "Sign in with Google to open your workspace.",
        401,
      );
    const auth = firebaseAdminAuth();
    const claims = await auth.verifyIdToken(body.idToken, true);
    if (!isGoogleIdentity(claims))
      throw new RequestError("Use a verified Google account to sign in.", 401);
    const age = Date.now() / 1000 - claims.auth_time;
    if (!Number.isFinite(age) || age < -60 || age > 300)
      throw new RequestError(
        "Please sign in with Google again to start a fresh session.",
        401,
      );
    await provisionGoogleUser(claims);
    const session = await auth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_SECONDS * 1000,
    });
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
    response.cookies.set(CSRF_COOKIE, "", {
      ...sessionCookieOptions,
      maxAge: 0,
      path: "/api/auth/session",
    });
    response.cookies.delete("auth");
    return response;
  } catch (error) {
    if (error instanceof RequestError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof AuthConfigurationError)
      return NextResponse.json(
        {
          error: "Google sign-in needs server setup. Follow FIREBASE-SETUP.md.",
        },
        { status: 503 },
      );
    const code = (error as { code?: string }).code;
    if (
      code?.startsWith("auth/") &&
      code !== "auth/internal-error" &&
      code !== "auth/invalid-credential"
    )
      return NextResponse.json(
        {
          error:
            "Your Google session is no longer valid. Please sign in again.",
        },
        { status: 401 },
      );
    return NextResponse.json(
      {
        error:
          "We couldn’t open your workspace. Check the server’s Firebase credentials and database connection.",
      },
      { status: 503 },
    );
  }
}
