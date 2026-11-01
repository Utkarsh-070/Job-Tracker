import { firebaseAdminAuth } from "./firebase/admin";
import { isGoogleIdentity } from "./firebase/policy";
import { provisionGoogleUser } from "./firebase/users";

export async function resolveApiUser(request: Request): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const idToken = authorization.slice(7);
  if (!idToken || idToken.length > 12000) return null;
  const adminAuth = firebaseAdminAuth();
  let claims;
  try {
    claims = await adminAuth.verifyIdToken(idToken, true);
  } catch {
    return null;
  }
  if (!isGoogleIdentity(claims)) return null;
  const user = await provisionGoogleUser(claims);
  return user.id;
}
