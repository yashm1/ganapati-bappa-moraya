import { del } from "@vercel/blob";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/runtime";
import { pandals } from "@/db/schema";
import { checkAdminAccess } from "../../_auth";

const allowedStatuses = new Set(["approved", "rejected"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessError = checkAdminAccess(request);
  if (accessError) return accessError;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  if (!body?.status || !allowedStatuses.has(body.status)) {
    return Response.json({ error: "Status must be approved or rejected" }, { status: 400 });
  }

  const [pandal] = await getDb()
    .select({ imageUrl: pandals.imageUrl })
    .from(pandals)
    .where(and(eq(pandals.id, id), eq(pandals.status, "pending")))
    .limit(1);

  if (!pandal) return Response.json({ error: "Pending pandal not found" }, { status: 404 });

  await getDb().update(pandals).set({ status: body.status }).where(eq(pandals.id, id));

  if (body.status === "rejected") await del(pandal.imageUrl).catch(() => undefined);

  return Response.json({ ok: true, status: body.status });
}