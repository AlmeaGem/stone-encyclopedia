import assert from "node:assert/strict";
import test from "node:test";
import worker from "../cloud/billing/worker.js";

async function call(path, method = "GET") {
  return worker.fetch(new Request("https://billing.example.test" + path, { method }));
}

test("health responds without exposing configuration", async () => {
  const response = await call("/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: "almeagem-billing-api",
    status: "ok",
  });
});

test("checkout is disabled until secure implementation is ready", async () => {
  const response = await call("/checkout", "POST");
  assert.equal(response.status, 503);
});

test("webhook cannot acknowledge unprocessed payments", async () => {
  const response = await call("/webhook/stripe", "POST");
  assert.equal(response.status, 503);
});

test("unknown routes are not found", async () => {
  const response = await call("/private");
  assert.equal(response.status, 404);
});
