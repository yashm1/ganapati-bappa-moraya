import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("nearby pandals are managed by a Google Maps marker cluster", async () => {
  const source = await readFile(new URL("../app/map-experience.tsx", import.meta.url), "utf8");

  assert.match(source, /MarkerClusterer/);
  assert.match(source, /markerClusterRef/);
  assert.match(source, /clearMarkers/);
});

test("cluster counts use a native marker label instead of rebuilding an SVG on every zoom", async () => {
  const source = await readFile(new URL("../app/map-experience.tsx", import.meta.url), "utf8");

  assert.match(source, /url: CLUSTER_MARKER_ICON/);
  assert.match(source, /label: \{\s*color: "#fff",[\s\S]*text: String\(count\),/);
  assert.doesNotMatch(source, /createClusterMarkerIcon\(count\)/);
});
