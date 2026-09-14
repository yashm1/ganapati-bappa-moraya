import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/site-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getSiteOrigin(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
