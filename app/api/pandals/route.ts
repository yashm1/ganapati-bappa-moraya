import { del, put } from "@vercel/blob";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/runtime";
import { pandals } from "@/db/schema";
import {
  consumeRateLimit,
  getClientIdentifier,
  hasValidImageSignature,
  isSameOriginRequest,
  rateLimitResponse,
} from "@/lib/request-security.mjs";

const validCrowd = new Set(["Low", "Moderate", "High"]);
const validImages = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET() {
  const results = await getDb()
    .select({
      id: pandals.id,
      name: pandals.name,
      area: pandals.area,
      description: pandals.description,
      longitude: pandals.longitude,
      latitude: pandals.latitude,
      imageUrl: pandals.imageUrl,
      eco: pandals.eco,
      crowd: pandals.crowd,
    })
    .from(pandals)
    .where(eq(pandals.status, "approved"))
    .orderBy(desc(pandals.createdAt));

  return Response.json({
    pandals: results.map((row) => ({
      id: row.id,
      name: row.name,
      area: row.area,
      coordinates: [row.longitude, row.latitude],
      image: row.imageUrl,
      crowd: validCrowd.has(row.crowd) ? row.crowd : "Moderate",
      wait: row.crowd === "Low" ? "5-10 min" : row.crowd === "High" ? "45+ min" : "20-30 min",
      eco: Boolean(row.eco),
      distance: "Community submission",
      description: row.description || "A community-submitted pandal shared by local devotees.",
    })),
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Cross-site submissions are not allowed" }, { status: 403 });
  }

  const rateLimit = consumeRateLimit("pandal-upload", getClientIdentifier(request), 6, 10 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 8_500_000) {
    return Response.json({ error: "The upload is too large" }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "The submission could not be read" }, { status: 400 });
  const photo = form.get("photo");
  const name = String(form.get("name") ?? "").trim();
  const area = String(form.get("area") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const longitude = Number(form.get("longitude"));
  const latitude = Number(form.get("latitude"));
  const eco = form.get("eco") === "true";
  const requestedCrowd = String(form.get("crowd") ?? "Moderate");
  const crowd = validCrowd.has(requestedCrowd) ? requestedCrowd : "Moderate";

  if (!(photo instanceof File) || !validImages.has(photo.type) || photo.size > 8_000_000) {
    return Response.json({ error: "Add a JPG, PNG, or WebP photo under 8 MB" }, { status: 400 });
  }
  if (!(await hasValidImageSignature(photo))) {
    return Response.json({ error: "The uploaded file does not contain a valid image" }, { status: 400 });
  }
  if (!name || !area || !description || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return Response.json({ error: "Name, neighbourhood, description, and location are required" }, { status: 400 });
  }
  if (name.length > 100 || area.length > 100) {
    return Response.json({ error: "Name and neighbourhood must be 100 characters or fewer" }, { status: 400 });
  }
  if (description.length > 320) {
    return Response.json({ error: "Description must be 320 characters or fewer" }, { status: 400 });
  }
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return Response.json({ error: "The captured location is not valid" }, { status: 400 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Photo storage is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel and .env.local." },
      { status: 503 },
    );
  }
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { error: "Database is not configured. Add DATABASE_URL in Vercel and .env.local." },
      { status: 503 },
    );
  }

  const id = crypto.randomUUID();
  const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
  const imageKey = `pandals/${id}.${extension}`;

  let imageUrl: string;
  try {
    const blob = await put(imageKey, photo, {
      access: "public",
      addRandomSuffix: false,
      contentType: photo.type,
      cacheControlMaxAge: 31536000,
    });
    imageUrl = blob.url;
  } catch {
    return Response.json(
      { error: "Photo storage upload failed. Verify BLOB_READ_WRITE_TOKEN and the Vercel Blob store." },
      { status: 503 },
    );
  }

  try {
    await getDb().insert(pandals).values({
      id,
      name,
      area,
      description,
      longitude,
      latitude,
      imageKey,
      imageUrl,
      eco,
      crowd,
      status: "pending",
      createdAt: Date.now(),
    });
  } catch {
    await del(imageUrl).catch(() => undefined);
    return Response.json(
      { error: "Database save failed. Verify DATABASE_URL and run the Drizzle migrations." },
      { status: 503 },
    );
  }

  return Response.json({
    pandal: {
      id,
      name,
      area,
      coordinates: [longitude, latitude],
      image: imageUrl,
      crowd,
      wait: crowd === "Low" ? "5-10 min" : crowd === "High" ? "45+ min" : "20-30 min",
      eco,
      distance: "Just added",
      description,
    },
    status: "pending",
  });
}
