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

  const html = await response.text();
  assert.match(html, /<title>Bappa Map \| Community Pandal Guide<\/title>/i);
  assert.match(html, /Bappa Map/);
  assert.match(html, /Explore pandals/);
  assert.match(html, /Lalbaugcha Raja/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships map, persistence, and upload capabilities without starter residue", async () => {
  const [page, mapExperience, vercelConfig, workflow, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/map-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/vercel.yml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /MapExperience/);
  assert.match(mapExperience, /clusterMaxZoom/);
  assert.match(mapExperience, /pandal-singleton-count/);
  assert.doesNotMatch(mapExperience, /Visarjan routes|visarjan-routes|immersion-points/);
  assert.match(mapExperience, /api\/pandals/);
  assert.match(mapExperience, /result\.pandals/);
  assert.match(vercelConfig, /"buildCommand": "npm run vercel-build"/);
  assert.match(workflow, /vercel deploy --yes/);
  assert.doesNotMatch(workflow, /vercel deploy --prebuilt/);
  assert.match(packageJson, /"db:migrate": "drizzle-kit migrate"/);
  assert.match(packageJson, /"maplibre-gl"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
