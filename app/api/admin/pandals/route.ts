import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/runtime";
import { pandals } from "@/db/schema";
import { checkAdminAccess } from "../_auth";

export async function GET(request: Request) {
  const accessError = checkAdminAccess(request);
  if (accessError) return accessError;

  const results = await getDb()
    .select({
      id: pandals.id,
      name: pandals.name,
      area: pandals.area,
      longitude: pandals.longitude,
      latitude: pandals.latitude,
      imageUrl: pandals.imageUrl,
      eco: pandals.eco,
      crowd: pandals.crowd,
      createdAt: pandals.createdAt,
    })
    .from(pandals)
    .where(eq(pandals.status, "pending"))
    .orderBy(desc(pandals.createdAt));

  return Response.json({
    pandals: results.map((row) => ({
      id: row.id,
      name: row.name,
      area: row.area,
      coordinates: [row.longitude, row.latitude],
      image: row.imageUrl,
      crowd: row.crowd,
      eco: Boolean(row.eco),
      createdAt: row.createdAt,
    })),
  });
}