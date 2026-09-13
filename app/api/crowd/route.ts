import { getDb } from "@/db/runtime";
import { crowdReports } from "@/db/schema";
import {
  consumeRateLimit,
  getClientIdentifier,
  isSameOriginRequest,
  rateLimitResponse,
} from "@/lib/request-security.mjs";

const levels = new Set(["Low", "Moderate", "High"]);

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Cross-site reports are not allowed" }, { status: 403 });
  }

  const rateLimit = consumeRateLimit("crowd-report", getClientIdentifier(request), 30, 5 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 2_000) {
    return Response.json({ error: "Crowd report is too large" }, { status: 413 });
  }

  const body = (await request.json().catch(() => null)) as { pandalId?: string; level?: string } | null;
  if (!body?.pandalId || !body.level || !levels.has(body.level) || !/^[a-zA-Z0-9-]{1,100}$/.test(body.pandalId)) {
    return Response.json({ error: "Invalid crowd report" }, { status: 400 });
  }

  try {
    await getDb().insert(crowdReports).values({
      id: crypto.randomUUID(),
      pandalId: body.pandalId,
      level: body.level,
      createdAt: Date.now(),
    });
  } catch {
    return Response.json({ error: "Crowd reports are temporarily unavailable" }, { status: 503 });
  }

  return Response.json({ ok: true });
}
