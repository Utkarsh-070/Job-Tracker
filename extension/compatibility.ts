type OffscreenApi = Pick<
  typeof chrome.offscreen,
  "hasDocument" | "createDocument" | "Reason"
>;

export function requireOffscreenSupport(api: unknown): OffscreenApi {
  const candidate = api as Partial<OffscreenApi> | null | undefined;
  if (
    typeof candidate?.hasDocument !== "function" ||
    typeof candidate.createDocument !== "function" ||
    candidate.Reason?.IFRAME_SCRIPTING !== "IFRAME_SCRIPTING"
  ) {
    throw new Error(
      "This browser is missing the extension features needed for Google sign-in. Update your desktop Chromium-based browser, then reload the extension.",
    );
  }
  return candidate as OffscreenApi;
}
