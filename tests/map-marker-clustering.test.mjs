import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("nearby pandals are managed by a Google Maps marker cluster", async () => {
  const source = await readFile(new URL("../app/map-experience.tsx", import.meta.url), "utf8");

  assert.match(source, /MarkerClusterer/);
  assert.match(source, /markerClusterRef/);
  assert.match(source, /clearMarkers/);
});
