import { getPublicAuthConfig } from "@/lib/firebase/public-config";
import { ExtensionAuthBridge } from "./ExtensionAuthBridge";
export const metadata = {
  title: "Connect Browser",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function ExtensionAuthPage() {
  try {
    return <ExtensionAuthBridge config={getPublicAuthConfig()} />;
  } catch {
    return (
      <main>
        <p>Google sign-in needs setup. Follow FIREBASE-SETUP.md.</p>
      </main>
    );
  }
}
