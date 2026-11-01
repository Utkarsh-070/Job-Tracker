import { validateSettings } from "./shared.ts";
import { isRecord, isGoogleCredential } from "./protocol.ts";
import type { GoogleSignInResult } from "./types.ts";

let isSigningIn = false;
chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    sender,
    sendResponse: (result: GoogleSignInResult) => void,
  ) => {
    if (
      !isRecord(message) ||
      message.target !== "offscreen" ||
      message.type !== "google-login" ||
      sender.id !== chrome.runtime.id
    )
      return false;
    if (isSigningIn) {
      sendResponse({ error: "A Google sign-in window is already open." });
      return false;
    }
    isSigningIn = true;
    let appUrl: string;
    try {
      if (typeof message.appUrl !== "string")
        throw new Error("Invalid tracker URL.");
      appUrl = validateSettings(message.appUrl).appUrl;
    } catch {
      isSigningIn = false;
      sendResponse({ error: "Enter a valid tracker URL." });
      return false;
    }
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    const authFrame = document.createElement("iframe");
    authFrame.src = appUrl + "/auth/extension";
    authFrame.title = "Google sign-in for Job Tracker";
    const timer = setTimeout(
      () =>
        finishSignIn({
          error: "Sign-in took too long. Open Settings and try again.",
        }),
      5 * 60 * 1000,
    );
    function finishSignIn(result: GoogleSignInResult) {
      clearTimeout(timer);
      window.removeEventListener("message", handleBridgeMessage);
      authFrame.remove();
      isSigningIn = false;
      sendResponse(result);
    }
    function handleBridgeMessage(event: MessageEvent<unknown>) {
      if (
        event.origin !== appUrl ||
        event.source !== authFrame.contentWindow ||
        !isRecord(event.data) ||
        event.data.channel !== "job-tracker-auth"
      )
        return;
      if (event.data.type === "ready")
        authFrame.contentWindow?.postMessage(
          { channel: "job-tracker-auth", type: "start", nonce },
          appUrl,
        );
      else if (event.data.type === "setup-error")
        finishSignIn({
          error: String(event.data.error || "Google sign-in needs setup."),
        });
      else if (event.data.type === "result" && event.data.nonce === nonce)
        finishSignIn(
          event.data.error
            ? { error: String(event.data.error) }
            : isGoogleCredential(event.data.credential)
              ? { credential: event.data.credential }
              : { error: "Google sign-in did not finish. Please try again." },
        );
    }
    window.addEventListener("message", handleBridgeMessage);
    authFrame.addEventListener(
      "error",
      () =>
        finishSignIn({
          error: "We couldn’t open your tracker’s Google sign-in page.",
        }),
      { once: true },
    );
    document.body.append(authFrame);
    return true;
  },
);
