import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  consumeRateLimit,
  getClientIdentifier,
  hasValidImageSignature,
  isSameOriginRequest,
} from "../lib/request-security.mjs";

test("same-origin checks reject cross-site browser requests", () => {
  const sameOrigin = new Request("https://bappa.example/api/pandals", {
    headers: { origin: "https://bappa.example", "x-forwarded-for": "203.0.113.8, 10.0.0.1" },
  });
  const crossOrigin = new Request("https://bappa.example/api/pandals", {
    headers: { origin: "https://attacker.example" },
  });

  assert.equal(isSameOriginRequest(sameOrigin), true);
  assert.equal(isSameOriginRequest(crossOrigin), false);
  assert.equal(getClientIdentifier(sameOrigin), "203.0.113.8");
});

test("rate limiter blocks requests after the configured burst", () => {
  const namespace = `test-${crypto.randomUUID()}`;
  assert.equal(consumeRateLimit(namespace, "client", 2, 60_000, 1_000).allowed, true);
  assert.equal(consumeRateLimit(namespace, "client", 2, 60_000, 1_001).allowed, true);
  const blocked = consumeRateLimit(namespace, "client", 2, 60_000, 1_002);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 60);
});

test("image validation checks bytes as well as the declared MIME type", async () => {
  const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "photo.jpg", { type: "image/jpeg" });
  const forged = new File(["not an image"], "photo.jpg", { type: "image/jpeg" });

  assert.equal(await hasValidImageSignature(jpeg), true);
  assert.equal(await hasValidImageSignature(forged), false);
});

test("public write routes enforce origin, rate, and content validation", async () => {
  const [pandalRoute, crowdRoute, adminAuth, nextConfig] = await Promise.all([
    readFile(new URL("../app/api/pandals/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/crowd/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/_auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(pandalRoute, /isSameOriginRequest/);
  assert.match(pandalRoute, /consumeRateLimit/);
  assert.match(pandalRoute, /hasValidImageSignature/);
  assert.match(crowdRoute, /isSameOriginRequest/);
  assert.match(crowdRoute, /consumeRateLimit/);
  assert.match(adminAuth, /timingSafeEqual/);
  assert.match(adminAuth, /consumeRateLimit/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /X-Frame-Options/);
});
