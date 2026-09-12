import { get } from "@vercel/blob";

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const blob = await get(decodeURIComponent(key), { access: "public" });
  if (!blob || blob.statusCode !== 200) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("content-type", blob.blob.contentType ?? "application/octet-stream");
  headers.set("etag", blob.blob.etag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(blob.stream, { headers });
}
