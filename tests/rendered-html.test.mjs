import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import test from "node:test";

const port = 3100 + (process.pid % 1000);
let server;

async function startServer() {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "ignore",
  });

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await fetch(`http://127.0.0.1:${port}/`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error("Next.js server did not start");
}

async function render() {
  await startServer();
  return fetch(`http://127.0.0.1:${port}/`, { headers: { accept: "text/html" } });
}

test.after(() => server?.kill());

test("server-renders the Bappa Map product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("permissions-policy") ?? "", /geolocation=\(self\)/);

  const html = await response.text();
  assert.match(html, /<title>Bappa Map \| Community Pandal Guide<\/title>/i);
  assert.match(html, /Bappa Map/);
  assert.match(html, /Explore pandals/);
  assert.match(html, /Lalbaugcha Raja/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships map, persistence, and upload capabilities without starter residue", async () => {
  const [page, layout, mapExperience, pandalRoute, adminPage, adminRoute, adminStatusRoute, vercelConfig, workflow, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/map-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/pandals/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/pandals/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/pandals/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/vercel.yml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /MapExperience/);
  assert.doesNotMatch(layout, /x-forwarded-host|headers\(\)/);
  assert.match(layout, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.doesNotMatch(mapExperience, /openfreemap|openmaptiles|maplibre/i);
  assert.match(mapExperience, /NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/);
  assert.match(mapExperience, /google\.com\/maps\/dir/);
  assert.match(mapExperience, /noopener noreferrer/);
  assert.match(mapExperience, /api\/pandals/);
  assert.match(mapExperience, /result\.pandals/);
  assert.match(mapExperience, /waiting for approval/);
  assert.match(mapExperience, /loadGoogleMaps/);
  assert.match(mapExperience, /installMapResumeHandler/);
  assert.match(mapExperience, /mobile-action-dock/);
  assert.match(mapExperience, /GOOGLE_MAP_STYLES/);
  assert.match(mapExperience, /MarkerClusterer/);
  assert.match(mapExperience, /SuperClusterAlgorithm/);
  assert.match(mapExperience, /compactViewport \? 28 : 34/);
  assert.match(mapExperience, /url: PANDAL_MARKER_ICON/);
  assert.doesNotMatch(mapExperience, /createPandalMarkerIcon/);
  assert.match(pandalRoute, /eq\(pandals\.status, "approved"\)/);
  assert.match(pandalRoute, /BLOB_READ_WRITE_TOKEN/);
  assert.match(pandalRoute, /Photo storage is not configured/);
  assert.match(pandalRoute, /Database is not configured/);
  assert.match(adminPage, /Approve community pandals/);
  assert.match(adminPage, /x-pandal-admin-key/);
  assert.match(adminRoute, /eq\(pandals\.status, "pending"\)/);
  assert.match(adminStatusRoute, /status must be approved or rejected/i);
  assert.match(vercelConfig, /"buildCommand": "npm run vercel-build"/);
  assert.match(workflow, /vercel deploy --yes/);
  assert.doesNotMatch(workflow, /vercel deploy --prebuilt/);
  assert.match(packageJson, /"db:migrate": "drizzle-kit migrate"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
