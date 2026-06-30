import { haversineDistanceMetres } from './haversine';

type DemoWard = {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
};

export const DEMO_WARDS: DemoWard[] = [
  { id: 'ward_01', name: 'Ward 1 - Central', centerLat: 11.0168, centerLng: 76.9558 },
  { id: 'ward_02', name: 'Ward 2 - North', centerLat: 11.03, centerLng: 76.96 },
  { id: 'ward_03', name: 'Ward 3 - East', centerLat: 11.019, centerLng: 76.977 },
  { id: 'ward_04', name: 'Ward 4 - South', centerLat: 11.001, centerLng: 76.951 },
  { id: 'ward_05', name: 'Ward 5 - West', centerLat: 11.014, centerLng: 76.934 },
];

export function getWardFromGPS(lat: number, lng: number): string {
  let nearest = DEMO_WARDS[0];
  let minDist = Infinity;
  for (const ward of DEMO_WARDS) {
    const dist = haversineDistanceMetres(
      { lat, lng },
      { lat: ward.centerLat, lng: ward.centerLng },
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = ward;
    }
  }
  return nearest.id;
}

export function getBoundaryCandidateWards(lat: number, lng: number): string[] {
  const distances = DEMO_WARDS.map((ward) => ({
    id: ward.id,
    metres: haversineDistanceMetres({ lat, lng }, { lat: ward.centerLat, lng: ward.centerLng }),
  })).sort((a, b) => a.metres - b.metres);

  const [first, second] = distances;
  if (second && Math.abs(second.metres - first.metres) <= 200) {
    return [first.id, second.id];
  }
  return [first.id];
}
