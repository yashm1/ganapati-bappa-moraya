import { get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/runtime";
import { pandals } from "@/db/schema";

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  let decodedKey: string;
  try {
    decodedKey = decodeURIComponent(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const fileName = decodedKey.startsWith("pandals/") ? decodedKey.slice("pandals/".length) : decodedKey;
  if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(fileName)) {
    return new Response("Not found", { status: 404 });
  }

  const imageKey = `pandals/${fileName}`;
  const [approvedPandal] = await getDb()
    .select({ id: pandals.id })
    .from(pandals)
    .where(and(eq(pandals.imageKey, imageKey), eq(pandals.status, "approved")))
    .limit(1);
  if (!approvedPandal) return new Response("Not found", { status: 404 });

  const blob = await get(imageKey, { access: "public" });
  if (!blob || blob.statusCode !== 200) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("content-type", blob.blob.contentType ?? "application/octet-stream");
  headers.set("etag", blob.blob.etag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(blob.stream, { headers });
}
