import test from "node:test";
import assert from "node:assert/strict";
import { readJson, RequestError } from "../src/lib/request";
const request = (body: string) =>
  new Request("https://example.com/api/test", { method: "POST", body });
test("JSON request parser accepts objects and rejects malformed shapes", async () => {
  assert.deepEqual(await readJson(request('{"company":"Acme"}')), {
    company: "Acme",
  });
  for (const body of ["{", "null", "[]"])
    await assert.rejects(
      readJson(request(body)),
      (error: unknown) => error instanceof RequestError && error.status === 400,
    );
});
test("body limit is enforced before JSON parsing", async () => {
  await assert.rejects(
    readJson(request("x".repeat(101)), 100),
    (error: unknown) => error instanceof RequestError && error.status === 413,
  );
});
