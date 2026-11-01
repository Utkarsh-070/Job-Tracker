import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  inMemoryPersistence,
  setPersistence,
} from "firebase/auth";
import type { PublicAuthConfig } from "./public-config";

export async function createBrowserAuth(
  config: PublicAuthConfig,
  name = "job-tracker-web",
) {
  const app =
    getApps().find((item) => item.name === name) ||
    initializeApp(config.firebase, name);
  const auth = getAuth(app);
  if (config.emulatorUrl && !auth.emulatorConfig)
    connectAuthEmulator(auth, config.emulatorUrl, { disableWarnings: true });
  // The server cookie owns the session; don't retain a browser refresh token.
  await setPersistence(auth, inMemoryPersistence);
  return auth;
}

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Continue with Google when you’re ready.";
    case "auth/popup-blocked":
      return "Your browser blocked Google’s window. Allow popups for this tracker, then try again.";
    case "auth/cancelled-popup-request":
      return "A sign-in window is already open. Finish there first.";
    case "auth/network-request-failed":
      return "We couldn’t reach Google. Check your connection and try again.";
    case "auth/unauthorized-domain":
      return "This tracker’s domain needs to be authorized in Firebase. Follow FIREBASE-SETUP.md.";
    case "auth/operation-not-allowed":
      return "Enable the Google provider in Firebase Authentication, then try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact the tracker owner.";
    default:
      return error instanceof Error && !code
        ? error.message
        : "We couldn’t sign you in. Please try again.";
  }
}
