export const siteDescription =
  "Find Ganesh Chaturthi pandals in Mumbai and across India, compare crowd levels, and plan your pandal-hopping route.";

export function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured) return "http://localhost:3000";

  try {
    const url = new URL(configured.startsWith("http") ? configured : `https://${configured}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : "http://localhost:3000";
  } catch {
    return "http://localhost:3000";
  }
}
