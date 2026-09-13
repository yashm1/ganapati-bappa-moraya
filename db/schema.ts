import { bigint, boolean, index, pgTable, real, text } from "drizzle-orm/pg-core";

export const pandals = pgTable(
  "pandals",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    area: text("area").notNull(),
    description: text("description").notNull().default(""),
    longitude: real("longitude").notNull(),
    latitude: real("latitude").notNull(),
    imageKey: text("image_key").notNull(),
    imageUrl: text("image_url").notNull(),
    eco: boolean("eco").notNull().default(false),
    crowd: text("crowd").notNull().default("Moderate"),
    status: text("status").notNull().default("pending"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("pandals_status_idx").on(table.status)],
);

export const crowdReports = pgTable(
  "crowd_reports",
  {
    id: text("id").primaryKey(),
    pandalId: text("pandal_id").notNull(),
    level: text("level").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("crowd_reports_pandal_time_idx").on(table.pandalId, table.createdAt)],
);
