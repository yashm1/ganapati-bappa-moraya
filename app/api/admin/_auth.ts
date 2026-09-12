import { timingSafeEqual } from "node:crypto";

export function checkAdminAccess(request: Request) {
  const expected = process.env.PANDAL_ADMIN_KEY;
  if (!expected) {
    return Response.json({ error: "PANDAL_ADMIN_KEY is not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-pandal-admin-key") ?? "";
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  const matches = expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);

  if (!matches) return Response.json({ error: "Admin access denied" }, { status: 401 });
  return null;
}