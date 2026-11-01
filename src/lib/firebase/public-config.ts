export type PublicAuthConfig = {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
  };
  extensionOrigins: string[];
  emulatorUrl?: string;
};

export function getPublicAuthConfig(): PublicAuthConfig {
  const apiKey = process.env.FIREBASE_API_KEY?.trim();
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.FIREBASE_APP_ID?.trim();
  if (!apiKey || !authDomain || !projectId || !appId)
    throw new Error(
      "Firebase is not configured. Follow FIREBASE-SETUP.md to enable Google sign-in.",
    );
  const extensionOrigins = (process.env.FIREBASE_EXTENSION_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-p]{32}$/.test(id))
    .map((id) => "chrome-extension://" + id);
  const config: PublicAuthConfig = {
    firebase: { apiKey, authDomain, projectId, appId },
    extensionOrigins,
  };
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (host && process.env.NODE_ENV === "development") {
    if (!/^(localhost|127\.0\.0\.1):\d{2,5}$/.test(host))
      throw new Error("The auth emulator must run on localhost.");
    config.emulatorUrl = "http://" + host;
  }
  return config;
}
