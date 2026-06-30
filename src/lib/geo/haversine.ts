export interface Coordinate {
  lat: number;
  lng: number;
}

export function haversineDistance(from: Coordinate, to: Coordinate): number {
  if (![from.lat, from.lng, to.lat, to.lng].every(Number.isFinite)) {
    return Number.NaN;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function haversineDistanceMetres(from: Coordinate, to: Coordinate): number {
  return haversineDistance(from, to) * 1000;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
