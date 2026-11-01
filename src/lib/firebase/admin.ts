import "server-only";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export class AuthConfigurationError extends Error {}

export function firebaseAdminAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId)
    throw new AuthConfigurationError(
      "Set FIREBASE_PROJECT_ID before signing in.",
    );
  if (
    process.env.FIREBASE_AUTH_EMULATOR_HOST &&
    process.env.NODE_ENV === "production"
  )
    throw new AuthConfigurationError(
      "The Firebase Auth emulator cannot be used in production.",
    );
  const name = "job-tracker-admin";
  const existing = getApps().find((app) => app.name === name);
  if (existing) return getAuth(existing);
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (Boolean(clientEmail) !== Boolean(privateKey))
    throw new AuthConfigurationError(
      "Set both server-side Firebase service-account values.",
    );
  const credential =
    clientEmail && privateKey
      ? cert({ projectId, clientEmail, privateKey })
      : applicationDefault();
  return getAuth(initializeApp({ projectId, credential }, name));
}
