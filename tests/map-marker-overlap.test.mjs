import assert from "node:assert/strict";
import test from "node:test";

import { spreadOverlappingPositions } from "../lib/map-markers.mjs";

const coLocatedPandals = [
  { id: "first", coordinates: [72.8364, 18.9902] },
  { id: "second", coordinates: [72.8364, 18.9902] },
  { id: "third", coordinates: [72.8364, 18.9902] },
];

test("co-located pandals receive distinct display positions", () => {
  const positions = spreadOverlappingPositions(coLocatedPandals);
  const rendered = coLocatedPandals.map((pandal) => positions.get(pandal.id));

  assert.equal(new Set(rendered.map((position) => position.join(","))).size, coLocatedPandals.length);
  assert.deepEqual(rendered[0], [72.8364, 18.9902]);
  assert.notDeepEqual(rendered[1], rendered[2]);
});

test("display positions stay stable when the same pandals are rendered again", () => {
  const firstRender = spreadOverlappingPositions(coLocatedPandals);
  const secondRender = spreadOverlappingPositions([...coLocatedPandals].reverse());

  assert.deepEqual(firstRender.get("first"), secondRender.get("first"));
  assert.deepEqual(firstRender.get("second"), secondRender.get("second"));
  assert.deepEqual(firstRender.get("third"), secondRender.get("third"));
});
