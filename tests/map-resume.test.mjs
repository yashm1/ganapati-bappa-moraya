import assert from "node:assert/strict";
import test from "node:test";

import { installMapResumeHandler } from "../lib/map-resume.mjs";

function createPageTargets() {
  const page = new EventTarget();
  const document = new EventTarget();
  Object.defineProperty(document, "visibilityState", { value: "hidden", writable: true });
  Object.defineProperty(page, "document", { value: document });
  return { page, document };
}

test("refreshes the map when returning from external navigation", () => {
  const { page, document } = createPageTargets();
  const calls = [];
  const cleanup = installMapResumeHandler(() => calls.push("refresh"), page);

  page.dispatchEvent(new Event("pageshow"));
  assert.deepEqual(calls, []);

  document.visibilityState = "visible";
  page.dispatchEvent(new Event("pageshow"));
  document.dispatchEvent(new Event("visibilitychange"));
  assert.deepEqual(calls, ["refresh", "refresh"]);

  cleanup();
  page.dispatchEvent(new Event("pageshow"));
  assert.deepEqual(calls, ["refresh", "refresh"]);
});
