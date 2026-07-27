export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const haversineDistance = (first: GeoPoint, second: GeoPoint) => {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(second.latitude - first.latitude);
  const deltaLongitude = toRadians(second.longitude - first.longitude);
  const value =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(first.latitude)) *
      Math.cos(toRadians(second.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const distanceToSegment = (
  point: GeoPoint,
  start: GeoPoint,
  end: GeoPoint,
) => {
  if (
    start.latitude === end.latitude &&
    start.longitude === end.longitude
  ) {
    return haversineDistance(point, start);
  }
  const deltaLongitude = end.longitude - start.longitude;
  const deltaLatitude = end.latitude - start.latitude;
  const lengthSquared =
    deltaLongitude * deltaLongitude + deltaLatitude * deltaLatitude;
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.longitude - start.longitude) * deltaLongitude +
        (point.latitude - start.latitude) * deltaLatitude) /
        lengthSquared,
    ),
  );
  return haversineDistance(point, {
    longitude: start.longitude + projection * deltaLongitude,
    latitude: start.latitude + projection * deltaLatitude,
  });
};

export const distanceToRoute = (point: GeoPoint, route: GeoPoint[]) => {
  if (route.length < 2) return Number.POSITIVE_INFINITY;
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 0; index < route.length - 1; index++) {
    minimum = Math.min(
      minimum,
      distanceToSegment(point, route[index], route[index + 1]),
    );
  }
  return minimum;
};

export const formatRouteDistance = (kilometers: number) =>
  kilometers < 0.1
    ? `${Math.round(kilometers * 1000)} m`
    : `${kilometers.toFixed(1)} km`;
