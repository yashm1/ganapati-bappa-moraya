import { getDb } from "@/db/runtime";
import { crowdReports } from "@/db/schema";

const levels = new Set(["Low", "Moderate", "High"]);

export async function POST(request: Request) {
  const body = (await request.json()) as { pandalId?: string; level?: string };
  if (!body.pandalId || !body.level || !levels.has(body.level)) {
    return Response.json({ error: "Invalid crowd report" }, { status: 400 });
  }

  await getDb().insert(crowdReports).values({
    id: crypto.randomUUID(),
    pandalId: body.pandalId,
    level: body.level,
    createdAt: Date.now(),
  });

  return Response.json({ ok: true });
}
