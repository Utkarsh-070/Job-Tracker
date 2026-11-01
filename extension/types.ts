import type { PublicAuthConfig } from "../src/lib/firebase/public-config";

export type TrackerSettings = { appUrl: string };

export type ExtensionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type JobDraft = {
  company: string;
  role: string;
  salary: string;
  url: string;
  notes: string;
  appliedAt: string;
};

export type ExtractedJob = Pick<
  JobDraft,
  "company" | "role" | "salary" | "notes"
>;

export type ValidatedDraft = Omit<JobDraft, "salary" | "notes" | "url"> & {
  salary: string | null;
  notes: string | null;
  url: string | null;
};

export type ExtensionStorage = {
  appUrl?: string;
  authSecret?: string;
  jobDraft?: JobDraft;
  draftOwner?: string;
  authConfig?: { appUrl: string; settings: PublicAuthConfig };
};

export type AuthRequest =
  | { type: "auth-status" }
  | { type: "auth-sign-in" }
  | { type: "auth-token"; forceRefresh?: boolean }
  | { type: "auth-sign-out" };

export type AuthResponses = {
  "auth-status": { user: ExtensionUser | null };
  "auth-sign-in": { user: ExtensionUser };
  "auth-token": { user: ExtensionUser; token: string };
  "auth-sign-out": { user: null };
};

export type AuthResponse =
  AuthResponses[AuthRequest["type"]] | { error: string };

export type GoogleCredential = {
  idToken?: string | null;
  accessToken?: string | null;
};

export type GoogleSignInResult =
  | { credential: GoogleCredential; error?: never }
  | { error: string; credential?: never };

export type OffscreenRequest = {
  target: "offscreen";
  type: "google-login";
  appUrl: string;
};

export type PopupElements = {
  company: HTMLInputElement;
  role: HTMLInputElement;
  salary: HTMLInputElement;
  url: HTMLInputElement;
  notes: HTMLTextAreaElement;
  "applied-at": HTMLInputElement;
  "app-url": HTMLInputElement;
  "main-view": HTMLElement;
  "settings-view": HTMLElement;
  "form-section": HTMLFormElement;
  "settings-form": HTMLFormElement;
  "capture-btn": HTMLButtonElement;
  "manual-btn": HTMLButtonElement;
  "save-applied-btn": HTMLButtonElement;
  "save-later-btn": HTMLButtonElement;
  "reset-btn": HTMLButtonElement;
  "settings-toggle": HTMLButtonElement;
  "save-settings": HTMLButtonElement;
  "sign-out": HTMLButtonElement;
  "open-tracker": HTMLButtonElement;
  "home-link": HTMLAnchorElement;
  "signed-in-account": HTMLElement;
  "account-name": HTMLElement;
  "account-email": HTMLElement;
  "google-button-label": HTMLElement;
  "connection-label": HTMLElement;
  "source-host": HTMLElement;
  "source-page": HTMLElement;
  "settings-msg": HTMLElement;
  "capture-msg": HTMLElement;
  "save-msg": HTMLElement;
};
