import { NextRequest, NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
export async function GET(request: NextRequest) {
  try {
    const id = await resolveApiUser(request);
    if (!id)
      return NextResponse.json(
        { error: "Sign in with Google to connect your tracker." },
        { status: 401 },
      );
    const user = await prisma.user.findUnique({
      where: { id },
      select: { firebaseUid: true, email: true, displayName: true },
    });
    return NextResponse.json(user, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Your tracker is unavailable. Check Firebase and the database connection.",
      },
      { status: 503 },
    );
  }
}
