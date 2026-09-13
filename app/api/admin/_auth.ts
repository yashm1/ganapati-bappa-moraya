import { timingSafeEqual } from "node:crypto";

import { consumeRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/request-security.mjs";

export function checkAdminAccess(request: Request) {
  const expected = process.env.PANDAL_ADMIN_KEY;
  if (!expected) {
    return Response.json({ error: "PANDAL_ADMIN_KEY is not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-pandal-admin-key") ?? "";
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  const matches =
    provided.length <= 512 &&
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes);

  if (!matches) {
    const rateLimit = consumeRateLimit("admin-auth", getClientIdentifier(request), 20, 15 * 60_000);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    return Response.json({ error: "Admin access denied" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  return null;
}
