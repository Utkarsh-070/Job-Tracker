import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { prisma } from "@/lib/prisma";

export function provisionGoogleUser(claims: DecodedIdToken) {
  const profile = {
    email: claims.email!,
    displayName:
      typeof claims.name === "string" ? claims.name.slice(0, 200) : null,
  };
  // Match accounts by verified UID; email is only display data.
  return prisma.user.upsert({
    where: { firebaseUid: claims.uid },
    create: { firebaseUid: claims.uid, ...profile },
    update: profile,
    select: { id: true, firebaseUid: true, email: true, displayName: true },
  });
}
