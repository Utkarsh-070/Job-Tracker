import type { PublicAuthConfig } from "../src/lib/firebase/public-config";
import type {
  AuthRequest,
  ExtensionUser,
  ExtractedJob,
  GoogleCredential,
} from "./types.ts";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getErrorMessage(error: unknown): string {
  return isRecord(error) && typeof error.message === "string"
    ? error.message
    : "";
}

export function responseError(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string" && value.error
    ? value.error
    : fallback;
}

export function isAuthRequest(value: unknown): value is AuthRequest {
  if (!isRecord(value) || value.target === "offscreen") return false;
  switch (value.type) {
    case "auth-status":
    case "auth-sign-in":
    case "auth-sign-out":
      return true;
    case "auth-token":
      return (
        value.forceRefresh === undefined ||
        typeof value.forceRefresh === "boolean"
      );
    default:
      return false;
  }
}

function isExtensionUser(value: unknown): value is ExtensionUser {
  return (
    isRecord(value) &&
    typeof value.uid === "string" &&
    value.uid.length > 0 &&
    (value.email === null || typeof value.email === "string") &&
    (value.displayName === null || typeof value.displayName === "string")
  );
}

export function readAuthResult(
  type: AuthRequest["type"],
  value: unknown,
): {
  user: ExtensionUser | null;
  token?: string;
} {
  const fallback =
    "We couldn’t connect to Google sign-in. Reload the extension and try again.";
  if (!isRecord(value) || value.error)
    throw new Error(responseError(value, fallback));
  const user = value.user;
  if (user !== null && !isExtensionUser(user)) throw new Error(fallback);
  if ((type === "auth-sign-in" || type === "auth-token") && !user)
    throw new Error(fallback);
  if (type === "auth-sign-out" && user !== null) throw new Error(fallback);
  if (type === "auth-token") {
    if (typeof value.token !== "string" || !value.token)
      throw new Error(fallback);
    return { user, token: value.token };
  }
  return { user };
}

export function isGoogleCredential(value: unknown): value is GoogleCredential {
  if (!isRecord(value)) return false;
  for (const key of ["idToken", "accessToken"] as const) {
    if (value[key] != null && typeof value[key] !== "string") return false;
  }
  return (
    (typeof value.idToken === "string" && value.idToken.length > 0) ||
    (typeof value.accessToken === "string" && value.accessToken.length > 0)
  );
}

export function isExtractedJob(value: unknown): value is ExtractedJob {
  return (
    isRecord(value) &&
    ["company", "role", "salary", "notes"].every(
      (key) => typeof value[key] === "string",
    )
  );
  // location, jobType, source are optional extras — no strict check needed
}

export function readAuthConfig(value: unknown): PublicAuthConfig {
  const incomplete = "The tracker’s Firebase configuration is incomplete.";
  if (!isRecord(value) || !isRecord(value.firebase))
    throw new Error(incomplete);
  const { apiKey, authDomain, projectId, appId } = value.firebase;
  if (
    typeof apiKey !== "string" ||
    !apiKey ||
    typeof authDomain !== "string" ||
    !authDomain ||
    typeof projectId !== "string" ||
    !projectId ||
    typeof appId !== "string" ||
    !appId ||
    !Array.isArray(value.extensionOrigins) ||
    (value.emulatorUrl !== undefined && typeof value.emulatorUrl !== "string")
  )
    throw new Error(incomplete);
  const extensionOrigins = value.extensionOrigins.filter(
    (origin: unknown): origin is string => typeof origin === "string",
  );
  if (extensionOrigins.length !== value.extensionOrigins.length)
    throw new Error(incomplete);
  return {
    firebase: { apiKey, authDomain, projectId, appId },
    extensionOrigins,
    ...(typeof value.emulatorUrl === "string"
      ? { emulatorUrl: value.emulatorUrl }
      : {}),
  };
}
