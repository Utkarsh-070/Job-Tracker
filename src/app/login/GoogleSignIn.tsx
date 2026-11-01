"use client";
import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";
import { createBrowserAuth, authErrorMessage } from "@/lib/firebase/client";
import { GoogleMark } from "@/components/ui/GoogleMark";

export function GoogleSignIn() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function prepare() {
      try {
        const response = await fetch("/api/auth/config", {
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        const config = await response.json();
        if (!response.ok)
          throw new Error(config.error || "Google sign-in needs setup.");
        const instance = await createBrowserAuth(config);
        if (active) setAuth(instance);
      } catch (reason) {
        if (active) setError(authErrorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    }
    prepare();
    return () => {
      active = false;
    };
  }, []);

  async function signIn() {
    if (!auth || busy) return;
    setBusy(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const csrfResponse = await fetch("/api/auth/csrf", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!csrfResponse.ok)
        throw new Error("We couldn’t prepare sign-in. Please try again.");
      const { csrfToken } = await csrfResponse.json();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, csrfToken }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "We couldn’t open your workspace.");
      await signOut(auth);
      window.location.assign("/");
    } catch (reason) {
      setError(authErrorMessage(reason));
      await signOut(auth).catch(() => {});
      setBusy(false);
    }
  }
  return (
    <div className="google-sign-in" aria-busy={busy || loading}>
      <button
        className="button google-button"
        type="button"
        onClick={signIn}
        disabled={!auth || busy || loading}
        aria-describedby="google-login-help"
      >
        <GoogleMark />
        {loading
          ? "Preparing sign-in…"
          : busy
            ? "Opening your workspace…"
            : "Continue with Google"}
      </button>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <p id="google-login-help" className="login-help">
        Your Google account opens your own private tracker. Use the same account
        in the Chrome extension.
      </p>
      <p className="login-session-note">
        Stay signed in for up to 14 days. Log out on shared devices.
      </p>
    </div>
  );
}
