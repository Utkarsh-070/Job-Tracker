import { NextResponse } from "next/server";
import { getPublicAuthConfig } from "@/lib/firebase/public-config";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(getPublicAuthConfig(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Google sign-in needs setup. Follow FIREBASE-SETUP.md in the project folder.",
      },
      { status: 503 },
    );
  }
}
