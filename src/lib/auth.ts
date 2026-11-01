import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { cache } from "react";
import { firebaseAdminAuth } from "./firebase/admin";
import { isGoogleIdentity, SESSION_COOKIE } from "./firebase/policy";

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session || session.length > 12000) return null;
  let claims;
  try {
    claims = await firebaseAdminAuth().verifySessionCookie(session, true);
  } catch {
    return null;
  }
  if (!isGoogleIdentity(claims)) return null;
  const user = await prisma.user.findUnique({
    where: { firebaseUid: claims.uid },
    select: { id: true, email: true, displayName: true },
  });
  return user;
});
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
export async function requireUser() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  return userId;
}
