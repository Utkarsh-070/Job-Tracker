import {
  today,
  validateSettings,
  permissionPattern,
  validateDraft,
} from "./shared.ts";
import {
  getErrorMessage,
  isExtractedJob,
  isRecord,
  readAuthResult,
  responseError,
} from "./protocol.ts";
import type {
  AuthRequest,
  AuthResponses,
  ExtensionStorage,
  ExtensionUser,
  JobDraft,
  PopupElements,
} from "./types.ts";
function byId<Id extends keyof PopupElements>(id: Id): PopupElements[Id] {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing popup element: ${id}`);
  return element as PopupElements[Id];
}
const fieldIds = [
  "company",
  "role",
  "salary",
  "url",
  "notes",
  "applied-at",
] as const;
let settings: ExtensionStorage = {};
let user: ExtensionUser | null = null;
let isBusy = false;
let isSaved = false;
let draftTimer: ReturnType<typeof setTimeout> | undefined;

function setStep(index: 0 | 1 | 2) {
  document.querySelectorAll(".capture-steps li").forEach((step, position) => {
    step.classList.toggle("current", position === index);
    if (position === index) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
}

function showView(name: "main" | "settings") {
  document
    .querySelectorAll(".view")
    .forEach((view) => view.classList.remove("active"));
  byId(`${name}-view`).classList.add("active");
  byId("settings-toggle").setAttribute(
    "aria-expanded",
    String(name === "settings"),
  );
}
type MessageId = "settings-msg" | "capture-msg" | "save-msg";
function showMessage(
  id: MessageId,
  text: string,
  type: "error" | "loading" | "success" = "error",
) {
  const element = byId(id);
  element.textContent = text;
  element.className = "status-msg " + type;
  element.setAttribute("role", type === "error" ? "alert" : "status");
}
function clearMessage(id: MessageId) {
  byId(id).textContent = "";
  byId(id).className = "status-msg";
}
function setBusy(value: boolean) {
  isBusy = value;
  for (const id of [
    "capture-btn",
    "manual-btn",
    "save-applied-btn",
    "save-later-btn",
    "reset-btn",
    "settings-toggle",
    "save-settings",
    "sign-out",
  ] as const)
    byId(id).disabled =
      value || (isSaved && ["save-applied-btn", "save-later-btn"].includes(id));
  for (const id of fieldIds) byId(id).disabled = value || isSaved;
  byId("form-section").setAttribute("aria-busy", String(value));
}
function readDraft(): JobDraft {
  return {
    company: byId("company").value,
    role: byId("role").value,
    salary: byId("salary").value,
    url: byId("url").value,
    notes: byId("notes").value,
    appliedAt: byId("applied-at").value,
  };
}
function fillDraft(draft: Partial<JobDraft> = {}) {
  for (const id of fieldIds)
    byId(id).value =
      draft[id === "applied-at" ? "appliedAt" : id] ??
      (id === "applied-at" ? today() : "");
}
async function persistDraft() {
  clearTimeout(draftTimer);
  if (!user || !settings.appUrl) return;
  await chrome.storage.local.set({
    jobDraft: readDraft(),
    draftOwner: settings.appUrl + "|" + user.uid,
  });
}
async function loadSettings() {
  const localSettings = await chrome.storage.local.get<ExtensionStorage>([
    "appUrl",
    "authSecret",
    "jobDraft",
    "draftOwner",
  ]);
  const syncedSettings = await chrome.storage.sync.get<
    Pick<ExtensionStorage, "appUrl">
  >(["appUrl"]);
  if (!localSettings.appUrl && syncedSettings.appUrl) {
    localSettings.appUrl = syncedSettings.appUrl;
    await chrome.storage.local.set({ appUrl: syncedSettings.appUrl });
  }
  // Retire credentials and unowned drafts from the access-key edition.
  await chrome.storage.local.remove("authSecret");
  await chrome.storage.sync.remove(["appUrl", "authSecret"]);
  if (localSettings.jobDraft && !localSettings.draftOwner) {
    await chrome.storage.local.remove("jobDraft");
    delete localSettings.jobDraft;
  }
  return localSettings;
}
function authRequest(
  type: "auth-status",
): Promise<AuthResponses["auth-status"]>;
function authRequest(
  type: "auth-sign-in",
): Promise<AuthResponses["auth-sign-in"]>;
function authRequest(
  type: "auth-sign-out",
): Promise<AuthResponses["auth-sign-out"]>;
function authRequest(
  type: "auth-token",
  extra: { forceRefresh: boolean },
): Promise<AuthResponses["auth-token"]>;
async function authRequest(
  type: AuthRequest["type"],
  extra: { forceRefresh?: boolean } = {},
) {
  const result = await chrome.runtime.sendMessage<object, unknown>({
    type,
    ...extra,
  });
  return readAuthResult(type, result);
}
function updateConnection() {
  byId("app-url").value = settings.appUrl || "";
  byId("signed-in-account").hidden = !user;
  byId("account-name").textContent = user?.displayName || "Google account";
  byId("account-email").textContent = user?.email || "";
  byId("google-button-label").textContent = user
    ? "Switch Google account"
    : "Continue with Google";
  byId("connection-label").textContent = settings.appUrl
    ? new URL(settings.appUrl).host
    : "Your next move, organized.";
  byId("open-tracker").hidden = !settings.appUrl;
}
async function saveSettings(event: Event) {
  event.preventDefault();
  if (isBusy) return;
  try {
    const nextSettings = validateSettings(byId("app-url").value);
    // Request only the selected origin, while the user's click is still active.
    const granted = await chrome.permissions.request({
      origins: [permissionPattern(nextSettings.appUrl)],
    });
    if (!granted)
      throw new Error(
        "Allow access to your tracker to connect. You can try again when ready.",
      );
    setBusy(true);
    clearTimeout(draftTimer);
    if (settings.appUrl && settings.appUrl !== nextSettings.appUrl) {
      await authRequest("auth-sign-out");
      await resetAfterAccountChange();
    }
    await chrome.storage.local.set(nextSettings);
    await chrome.storage.sync.remove(["appUrl", "authSecret"]);
    settings = nextSettings;
    showMessage(
      "settings-msg",
      "Choose your Google account in the sign-in window. You can reopen this popup when finished.",
      "loading",
    );
    const result = await authRequest("auth-sign-in");
    user = result.user;
    const stored = await chrome.storage.local.get<ExtensionStorage>([
      "jobDraft",
      "draftOwner",
    ]);
    if (
      stored.draftOwner === settings.appUrl + "|" + user.uid &&
      stored.jobDraft
    ) {
      fillDraft(stored.jobDraft);
      byId("form-section").classList.add("active");
      setStep(1);
    } else await resetAfterAccountChange();
    updateConnection();
    showView("main");
    showMessage(
      "capture-msg",
      "Connected as " +
        (user.email || "your Google account") +
        ". Open a job posting to get started.",
      "success",
    );
  } catch (error) {
    showMessage(
      "settings-msg",
      getErrorMessage(error) ||
        "We couldn’t save your connection. Please try again.",
    );
  } finally {
    setBusy(false);
    updateConnection();
  }
}
async function resetAfterAccountChange() {
  isSaved = false;
  fillDraft();
  byId("form-section").classList.remove("active");
  setStep(0);
  clearMessage("save-msg");
}
async function signOutAccount() {
  if (isBusy) return;
  setBusy(true);
  clearTimeout(draftTimer);
  try {
    await authRequest("auth-sign-out");
    user = null;
    await resetAfterAccountChange();
    updateConnection();
    showView("settings");
    showMessage(
      "settings-msg",
      "Signed out. Your saved applications are still in your Google account’s tracker.",
      "success",
    );
  } catch (error) {
    showMessage("settings-msg", getErrorMessage(error));
  } finally {
    setBusy(false);
  }
}
async function activePage(): Promise<
  chrome.tabs.Tab & { id: number; url: string }
> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:\/\//.test(tab.url))
    throw new Error(
      "Open a job posting on a website. Browser’s internal pages can’t be captured.",
    );
  return { ...tab, id: tab.id, url: tab.url };
}
async function trackerRequest(
  path: "/api/extract" | "/api/applications",
  body: object,
): Promise<Record<string, unknown>> {
  const config = validateSettings(settings.appUrl || "");
  if (
    !(await chrome.permissions.contains({
      origins: [permissionPattern(config.appUrl)],
    }))
  )
    throw new Error(
      "Reconnect your tracker in Settings to allow access to its URL.",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    async function send(forceRefresh = false) {
      const { token, user: account } = await authRequest("auth-token", {
        forceRefresh,
      });
      if (!user || account.uid !== user.uid)
        throw new Error(
          "Your Google account changed. Reopen the extension before saving.",
        );
      return fetch(config.appUrl + path, {
        method: "POST",
        credentials: "omit",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    }
    let response = await send();
    if (response.status === 401) response = await send(true);
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new Error(
        "Your tracker returned a web page. Check the app URL and install the updated app.",
      );
    const result: unknown = await response.json();
    if (response.status === 401) {
      showView("settings");
      showMessage(
        "settings-msg",
        "Your Google session expired. Continue with Google to reconnect.",
      );
    }
    if (!response.ok)
      throw new Error(
        responseError(
          result,
          "The tracker returned an error (" +
            response.status +
            "). Please try again.",
        ),
      );
    if (!isRecord(result))
      throw new Error(
        "The tracker returned invalid details. Please try again.",
      );
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "The tracker took too long to respond. Your draft is safe; check your connection before trying again.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "We couldn’t reach the tracker. Check its URL, connection, and that the app is running.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
async function captureJob() {
  if (isBusy) return;
  if (!settings.appUrl || !user) {
    showView("settings");
    return;
  }
  isSaved = false;
  setBusy(true);
  setStep(0);
  clearMessage("save-msg");
  showMessage("capture-msg", "Reading this posting…", "loading");
  try {
    const tab = await activePage();
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const main = document.querySelector<HTMLElement>(
          "main, [role='main'], article",
        );
        const text = main?.innerText?.trim();
        return (
          text && text.length > 80 ? text : document.body?.innerText || ""
        )
          .trim()
          .slice(0, 12000);
      },
    });
    const pageText = results[0]?.result;
    if (typeof pageText !== "string" || !pageText.trim())
      throw new Error(
        "This page has no readable job text. Try a different posting or enter the details yourself.",
      );
    showMessage("capture-msg", "Finding the essentials with AI…", "loading");
    const extracted = await trackerRequest("/api/extract", { pageText });
    if (!isExtractedJob(extracted))
      throw new Error(
        "Capture returned incomplete details. Enter them manually or try again.",
      );
    fillDraft({ ...extracted, url: tab.url, appliedAt: today() });
    byId("form-section").classList.add("active");
    setStep(1);
    await persistDraft();
    showMessage(
      "capture-msg",
      "Details captured. Review them before saving.",
      "success",
    );
    byId("company").focus();
  } catch (error) {
    showMessage(
      "capture-msg",
      getErrorMessage(error) ||
        "This page could not be read. Try refreshing or enter the details yourself.",
    );
  } finally {
    setBusy(false);
  }
}
async function manualEntry() {
  if (isBusy) return;
  isSaved = false;
  setBusy(false);
  if (!byId("form-section").classList.contains("active")) {
    let url = "";
    try {
      url = (await activePage()).url;
    } catch {
      /* Manual entry also works on an internal page. */
    }
    fillDraft({ url });
    byId("form-section").classList.add("active");
  }
  clearMessage("capture-msg");
  clearMessage("save-msg");
  setStep(1);
  byId("company").focus();
}
async function saveJob(status: "APPLIED" | "SAVED") {
  if (isBusy || isSaved) return;
  clearMessage("save-msg");
  let input;
  try {
    input = validateDraft(readDraft());
  } catch (error) {
    showMessage("save-msg", getErrorMessage(error));
    return;
  }
  setBusy(true);
  setStep(2);
  showMessage("save-msg", "Saving to your tracker…", "loading");
  try {
    await persistDraft();
    await trackerRequest("/api/applications", { ...input, status });
    isSaved = true;
    await chrome.storage.local.remove(["jobDraft", "draftOwner"]);
    showMessage(
      "save-msg",
      status === "SAVED"
        ? "Saved for later. Pick it up in your tracker."
        : "Application saved. Your next move is in the tracker.",
      "success",
    );
  } catch (error) {
    setStep(1);
    showMessage(
      "save-msg",
      getErrorMessage(error) || "We couldn’t save. Your draft is still here.",
    );
  } finally {
    setBusy(false);
  }
}
async function resetDraft() {
  if (isBusy) return;
  clearTimeout(draftTimer);
  await chrome.storage.local.remove(["jobDraft", "draftOwner"]);
  isSaved = false;
  setBusy(false);
  fillDraft();
  byId("form-section").classList.remove("active");
  setStep(0);
  clearMessage("capture-msg");
  clearMessage("save-msg");
}
document.addEventListener("DOMContentLoaded", async () => {
  byId("settings-form").addEventListener("submit", saveSettings);
  byId("sign-out").addEventListener("click", signOutAccount);
  byId("capture-btn").addEventListener("click", captureJob);
  byId("manual-btn").addEventListener("click", manualEntry);
  byId("form-section").addEventListener("submit", (event) => {
    event.preventDefault();
    saveJob("APPLIED");
  });
  byId("save-later-btn").addEventListener("click", () => saveJob("SAVED"));
  byId("reset-btn").addEventListener("click", () =>
    resetDraft().catch(() =>
      showMessage("save-msg", "Couldn’t clear the draft. Please try again."),
    ),
  );
  byId("settings-toggle").addEventListener("click", () => {
    clearMessage("settings-msg");
    showView(
      byId("settings-view").classList.contains("active") && user
        ? "main"
        : "settings",
    );
  });
  byId("home-link").addEventListener("click", (event) => {
    event.preventDefault();
    showView(settings.appUrl && user ? "main" : "settings");
  });
  byId("open-tracker").addEventListener("click", () => {
    if (settings.appUrl) chrome.tabs.create({ url: settings.appUrl });
  });
  for (const id of fieldIds)
    byId(id).addEventListener("input", () => {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(
        () =>
          persistDraft().catch(() =>
            showMessage(
              "save-msg",
              "Your draft couldn’t be stored on this device.",
            ),
          ),
        250,
      );
    });
  try {
    if (chrome.storage.local.setAccessLevel)
      await chrome.storage.local.setAccessLevel({
        accessLevel: "TRUSTED_CONTEXTS",
      });
    settings = await loadSettings();
    if (settings.appUrl)
      settings = {
        ...settings,
        ...validateSettings(settings.appUrl),
      };
    if (settings.appUrl) {
      showView("settings");
      showMessage(
        "settings-msg",
        "Restoring your Google session… Finish any open sign-in window.",
        "loading",
      );
      user = (await authRequest("auth-status")).user;
      clearMessage("settings-msg");
    }
    updateConnection();
    const ownsDraft =
      user && settings.draftOwner === settings.appUrl + "|" + user.uid;
    fillDraft(ownsDraft ? settings.jobDraft : undefined);
    if (ownsDraft && settings.jobDraft) {
      byId("form-section").classList.add("active");
      setStep(1);
    }
    if (settings.jobDraft && user && !ownsDraft)
      await chrome.storage.local.remove(["jobDraft", "draftOwner"]);
    showView(settings.appUrl && user ? "main" : "settings");
    try {
      const tab = await activePage();
      byId("source-host").textContent = new URL(tab.url).host;
      byId("source-page").hidden = false;
    } catch {
      /* Show recovery guidance when capture is attempted. */
    }
  } catch (error) {
    showView("settings");
    showMessage(
      "settings-msg",
      getErrorMessage(error) ||
        "Your connection couldn’t be loaded. Enter your tracker URL and continue with Google.",
    );
  }
});
