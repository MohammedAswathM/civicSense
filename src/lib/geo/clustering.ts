import { haversineDistanceMetres, type Coordinate } from './haversine';

export interface ClusterablePoint extends Coordinate {
  id: string;
}

export function nearbyPointIds(
  origin: Coordinate,
  points: ClusterablePoint[],
  radiusMetres: number,
): string[] {
  return points
    .filter((point) => haversineDistanceMetres(origin, point) <= radiusMetres)
    .map((point) => point.id);
}
