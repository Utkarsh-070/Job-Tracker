"use client";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { createBrowserAuth, authErrorMessage } from "@/lib/firebase/client";
import type { PublicAuthConfig } from "@/lib/firebase/public-config";

export function ExtensionAuthBridge({ config }: { config: PublicAuthConfig }) {
  const [status, setStatus] = useState(
    "Connecting your Google account to Chrome…",
  );
  useEffect(() => {
    const parentOrigin = window.location.ancestorOrigins?.[0];
    if (
      window.parent === window ||
      !parentOrigin ||
      !config.extensionOrigins.includes(parentOrigin)
    ) {
      return;
    }
    let active = true;
    let running = false;
    const prepare = createBrowserAuth(config, "job-tracker-extension-bridge");
    function send(value: object) {
      if (active)
        window.parent.postMessage(
          { channel: "job-tracker-auth", ...value },
          parentOrigin,
        );
    }
    async function receive(event: MessageEvent) {
      if (
        event.origin !== parentOrigin ||
        event.source !== window.parent ||
        running ||
        event.data?.channel !== "job-tracker-auth" ||
        event.data?.type !== "start" ||
        typeof event.data?.nonce !== "string" ||
        !/^[a-f0-9]{64}$/.test(event.data.nonce)
      )
        return;
      running = true;
      const nonce = event.data.nonce;
      try {
        const auth = await prepare;
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential || (!credential.idToken && !credential.accessToken))
          throw new Error("Google returned no credential. Please try again.");
        send({
          type: "result",
          nonce,
          credential: {
            idToken: credential.idToken,
            accessToken: credential.accessToken,
          },
        });
        await signOut(auth);
        if (active) setStatus("Connected. You can return to the extension.");
      } catch (error) {
        send({ type: "result", nonce, error: authErrorMessage(error) });
        if (active) setStatus(authErrorMessage(error));
      }
    }
    window.addEventListener("message", receive);
    prepare
      .then(() => send({ type: "ready" }))
      .catch((error) =>
        send({ type: "setup-error", error: authErrorMessage(error) }),
      );
    return () => {
      active = false;
      window.removeEventListener("message", receive);
    };
  }, [config]);
  return (
    <main className="auth-bridge-message">
      <p>{status}</p>
    </main>
  );
}
