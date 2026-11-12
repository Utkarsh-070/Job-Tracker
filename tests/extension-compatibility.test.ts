import test from "node:test";
import assert from "node:assert/strict";
import { requireOffscreenSupport } from "../extension/compatibility.ts";

test("supported Chromium extension APIs keep their original object and methods", () => {
  const api = {
    hasDocument: async () => false,
    createDocument: async () => {},
    Reason: { IFRAME_SCRIPTING: "IFRAME_SCRIPTING" },
  };
  assert.equal(requireOffscreenSupport(api), api);
});
test("missing browser features show recovery guidance before extension sign-in", () => {
  const complete = {
    hasDocument: async () => false,
    createDocument: async () => {},
    Reason: { IFRAME_SCRIPTING: "IFRAME_SCRIPTING" },
  };
  for (const api of [
    undefined,
    null,
    {},
    "unsupported",
    { ...complete, hasDocument: undefined },
    { ...complete, createDocument: undefined },
    { ...complete, Reason: {} },
  ]) {
    assert.throws(
      () => requireOffscreenSupport(api),
      /Update your desktop Chromium-based browser/,
    );
  }
});
