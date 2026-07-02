// Heatmap points clustered around Brandeis campus + Moody Street.

export interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
}

function generateCluster(
  centerLat: number,
  centerLng: number,
  count: number,
  spread: number
): HeatPoint[] {
  const points: HeatPoint[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      lat: centerLat + (Math.random() - 0.5) * spread,
      lng: centerLng + (Math.random() - 0.5) * spread,
      weight: 0.5 + Math.random() * 0.5,
    });
  }
  return points;
}

export const HEATMAP_POINTS: HeatPoint[] = [
  // --- Friend dots ---
  { lat: 42.3667, lng: -71.2593, weight: 1 },
  { lat: 42.3666, lng: -71.2610, weight: 1 },
  { lat: 42.3676, lng: -71.2580, weight: 1 },
  { lat: 42.3653, lng: -71.2588, weight: 1 },
  { lat: 42.3663, lng: -71.2600, weight: 1 },
  { lat: 42.3660, lng: -71.2586, weight: 1 },
  { lat: 42.3671, lng: -71.2603, weight: 1 },
  { lat: 42.3760, lng: -71.2360, weight: 1 },

  // --- Moments crowds ---
  ...generateCluster(42.3663, -71.2600, 25, 0.001),  // Great Lawn concert
  ...generateCluster(42.3676, -71.2580, 12, 0.0008), // Gosman pickup ball
  ...generateCluster(42.3667, -71.2593, 8,  0.0006), // Usdan pizza run

  // --- Busy spots on campus ---
  ...generateCluster(42.3660, -71.2588, 35, 0.0012), // Shapiro / Grind Coffee
  ...generateCluster(42.3666, -71.2610, 30, 0.001),  // Sherman
  ...generateCluster(42.3653, -71.2588, 20, 0.001),  // Goldfarb Library
  ...generateCluster(42.3671, -71.2603, 15, 0.0009), // Massell Quad

  // --- Moody Street nightlife ---
  ...generateCluster(42.3758, -71.2365, 50, 0.0015), // Velvet Rooftop / Neon Nights cluster
  ...generateCluster(42.3752, -71.2360, 25, 0.0012), // Koi Ramen

  // --- Ambient foot traffic ---
  ...generateCluster(42.3665, -71.2595, 20, 0.003),
  ...generateCluster(42.3658, -71.2600, 15, 0.0025),
  ...generateCluster(42.3760, -71.2362, 12, 0.002),
];

export const HEATMAP_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: HEATMAP_POINTS.map((p) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: { weight: p.weight },
  })),
};
