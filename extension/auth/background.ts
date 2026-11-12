import type { Auth, User } from "firebase/auth/web-extension";
import type { PublicAuthConfig } from "../../src/lib/firebase/public-config";
import type {
  AuthRequest,
  AuthResponse,
  ExtensionStorage,
  ExtensionUser,
  OffscreenRequest,
} from "../types.ts";
import {
  isAuthRequest,
  isGoogleCredential,
  isRecord,
  readAuthConfig,
  responseError,
} from "../protocol.ts";
import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth/web-extension";
import { permissionPattern, validateSettings } from "../shared.ts";

import { requireOffscreenSupport } from "../compatibility.ts";

let activeInstance: { appUrl: string; auth: Auth } | undefined;
let signingIn: Promise<ExtensionUser> | null = null;
let creatingOffscreen: Promise<void> | null = null;

function getUserProfile(user: User): ExtensionUser;
function getUserProfile(user: User | null | undefined): ExtensionUser | null;
function getUserProfile(user: User | null | undefined): ExtensionUser | null {
  return user
    ? { uid: user.uid, email: user.email, displayName: user.displayName }
    : null;
}

async function getTrackerAuth() {
  const { appUrl } = await chrome.storage.local.get<ExtensionStorage>("appUrl");
  if (!appUrl) return null;
  const config = validateSettings(appUrl);
  if (activeInstance?.appUrl === config.appUrl) return activeInstance.auth;
  if (
    !(await chrome.permissions.contains({
      origins: [permissionPattern(config.appUrl)],
    }))
  )
    throw new Error("Allow access to your tracker in Settings to reconnect.");
  const { authConfig } =
    await chrome.storage.local.get<ExtensionStorage>("authConfig");
  let settings: PublicAuthConfig;
  try {
    const response = await fetch(config.appUrl + "/api/auth/config", {
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new Error(
        "Check the tracker URL. It did not return Firebase settings.",
      );
    const body: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        responseError(body, "Google sign-in needs setup on this tracker."),
      );
    settings = readAuthConfig(body);
  } catch (error) {
    if (authConfig?.appUrl !== config.appUrl) throw error;
    settings = authConfig.settings;
  }
  if (
    !settings.extensionOrigins?.includes(
      chrome.runtime.getURL("").replace(/\/$/, ""),
    )
  )
    throw new Error(
      "This extension needs to be authorized by the tracker owner. Follow FIREBASE-SETUP.md.",
    );
  for (const key of ["apiKey", "authDomain", "projectId", "appId"] as const)
    if (typeof settings.firebase?.[key] !== "string" || !settings.firebase[key])
      throw new Error("The tracker’s Firebase configuration is incomplete.");
  await chrome.storage.local.set({
    authConfig: { appUrl: config.appUrl, settings },
  });
  const name = "job-tracker-" + settings.firebase.projectId;
  const app =
    getApps().find((item) => item.name === name) ||
    initializeApp(settings.firebase, name);
  const auth = getAuth(app);
  if (settings.emulatorUrl && !auth.emulatorConfig) {
    const emulator = new URL(settings.emulatorUrl);
    const tracker = new URL(config.appUrl);
    if (
      !["localhost", "127.0.0.1"].includes(emulator.hostname) ||
      !["localhost", "127.0.0.1"].includes(tracker.hostname) ||
      emulator.protocol !== "http:"
    )
      throw new Error(
        "The Firebase emulator is only allowed for a local tracker.",
      );
    connectAuthEmulator(auth, emulator.origin, { disableWarnings: true });
  }
  await auth.authStateReady();
  activeInstance = { appUrl: config.appUrl, auth };
  return auth;
}

async function ensureOffscreenDocument() {
  const offscreen = requireOffscreenSupport(chrome.offscreen);
  if (await offscreen.hasDocument()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = offscreen
      .createDocument({
        url: "offscreen.html",
        reasons: [offscreen.Reason.IFRAME_SCRIPTING],
        justification:
          "Let Firebase show Google sign-in from the selected tracker without loading remote code in the extension.",
      })
      .finally(() => {
        creatingOffscreen = null;
      });
  }
  await creatingOffscreen;
}

async function login() {
  const auth = await getTrackerAuth();
  if (!auth) throw new Error("Enter your tracker URL first.");
  const { appUrl } = await chrome.storage.local.get<ExtensionStorage>("appUrl");
  if (!appUrl) throw new Error("Enter your tracker URL first.");
  await ensureOffscreenDocument();
  try {
    const result = await chrome.runtime.sendMessage<OffscreenRequest, unknown>({
      target: "offscreen",
      type: "google-login",
      appUrl,
    });
    if (isRecord(result) && typeof result.error === "string")
      throw new Error(result.error);
    if (!isRecord(result) || !isGoogleCredential(result.credential))
      throw new Error("Google sign-in did not finish. Please try again.");
    const credential = GoogleAuthProvider.credential(
      result.credential.idToken || null,
      result.credential.accessToken || null,
    );
    const signedIn = await signInWithCredential(auth, credential);
    const idToken = await signedIn.user.getIdToken();
    const response = await fetch(appUrl + "/api/auth/me", {
      headers: { Authorization: "Bearer " + idToken },
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => ({}));
      await signOut(auth);
      throw new Error(
        responseError(body, "We couldn’t open this Google account’s tracker."),
      );
    }
    const previous =
      await chrome.storage.local.get<ExtensionStorage>("draftOwner");
    const owner = appUrl + "|" + signedIn.user.uid;
    if (previous.draftOwner !== owner)
      await chrome.storage.local.remove(["jobDraft", "draftOwner"]);
    return getUserProfile(signedIn.user);
  } finally {
    if (await chrome.offscreen.hasDocument())
      await chrome.offscreen.closeDocument();
  }
}

async function logout(clearDraft = true) {
  // Use cached config so logout also works offline.
  let auth = activeInstance?.auth;
  if (!auth) {
    const { authConfig } =
      await chrome.storage.local.get<ExtensionStorage>("authConfig");
    if (authConfig?.settings?.firebase) {
      const config = authConfig.settings.firebase;
      const name = "job-tracker-" + config.projectId;
      const app =
        getApps().find((item) => item.name === name) ||
        initializeApp(config, name);
      auth = getAuth(app);
      await auth.authStateReady();
    }
  }
  if (auth) await signOut(auth);
  for (const app of getApps()) {
    const other = getAuth(app);
    await other.authStateReady();
    if (other.currentUser) await signOut(other);
  }
  await chrome.storage.local.remove(
    clearDraft ? ["jobDraft", "draftOwner", "authSecret"] : "authSecret",
  );
  await chrome.storage.sync.remove("authSecret");
  activeInstance = undefined;
}

async function handleAuthMessage(message: AuthRequest): Promise<AuthResponse> {
  switch (message.type) {
    case "auth-status": {
      if (signingIn) await signingIn.catch(() => null);
      return { user: getUserProfile((await getTrackerAuth())?.currentUser) };
    }
    case "auth-sign-in": {
      if (!signingIn)
        signingIn = login().finally(() => {
          signingIn = null;
        });
      return { user: await signingIn };
    }
    case "auth-token": {
      const auth = await getTrackerAuth();
      if (!auth?.currentUser)
        throw new Error(
          "Sign in with Google in Settings to save to your tracker.",
        );
      try {
        return {
          token: await auth.currentUser.getIdToken(
            Boolean(message.forceRefresh),
          ),
          user: getUserProfile(auth.currentUser),
        };
      } catch {
        await logout(false);
        throw new Error(
          "Your Google session expired. Sign in again in Settings.",
        );
      }
    }
    case "auth-sign-out":
      await logout();
      return { user: null };
    default:
      throw new Error("Unknown authentication request.");
  }
}

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    sender,
    sendResponse: (response: AuthResponse) => void,
  ) => {
    if (!isAuthRequest(message)) return false;
    if (
      sender.id !== chrome.runtime.id ||
      sender.url !== chrome.runtime.getURL("popup.html") ||
      !["auth-status", "auth-sign-in", "auth-token", "auth-sign-out"].includes(
        message.type,
      )
    )
      return false;
    handleAuthMessage(message)
      .then(sendResponse)
      .catch((error) => {
        // Firebase error objects can contain credentials; return only safe text.
        sendResponse({
          error:
            error instanceof Error && !("code" in error)
              ? error.message.slice(0, 500)
              : "Authentication could not finish. Check your tracker connection and sign in again.",
        });
      });
    return true;
  },
);
