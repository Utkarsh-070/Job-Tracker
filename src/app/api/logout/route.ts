import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin, SESSION_COOKIE } from "@/lib/firebase/policy";
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const store = await cookies();
  store.delete("auth");
  store.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
