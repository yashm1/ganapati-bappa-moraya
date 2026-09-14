const SPIDERFY_RADIUS_METERS = 24;
const METERS_PER_DEGREE_LATITUDE = 111_320;

/**
 * Give pandals that share a map location distinct display positions.
 * The first sorted pandal stays on the recorded location; the others fan out
 * in a stable pattern so the same pins do not hide one another.
 *
 * @param {Array<{id: string, coordinates: [number, number]}>} pandals
 * @returns {Map<string, [number, number]>}
 */
export function spreadOverlappingPositions(pandals) {
  const groups = new Map();

  for (const pandal of pandals) {
    const key = locationKey(pandal.coordinates);
    const group = groups.get(key) ?? [];
    group.push(pandal);
    groups.set(key, group);
  }

  const positions = new Map();
  for (const group of groups.values()) {
    group.sort((a, b) => a.id.localeCompare(b.id));
    const offsetCount = Math.max(1, group.length - 1);

    group.forEach((pandal, index) => {
      if (index === 0) {
        positions.set(pandal.id, pandal.coordinates);
        return;
      }

      const angle = -Math.PI / 2 + ((index - 1) * Math.PI * 2) / offsetCount;
      positions.set(pandal.id, offsetCoordinate(pandal.coordinates, angle));
    });
  }

  return positions;
}

function locationKey([longitude, latitude]) {
  return `${longitude.toFixed(5)}:${latitude.toFixed(5)}`;
}

function offsetCoordinate([longitude, latitude], angle) {
  const latitudeOffset = (SPIDERFY_RADIUS_METERS * Math.sin(angle)) / METERS_PER_DEGREE_LATITUDE;
  const longitudeScale = Math.max(0.1, Math.cos((latitude * Math.PI) / 180));
  const longitudeOffset = (SPIDERFY_RADIUS_METERS * Math.cos(angle)) / (METERS_PER_DEGREE_LATITUDE * longitudeScale);
  return [longitude + longitudeOffset, latitude + latitudeOffset];
}
