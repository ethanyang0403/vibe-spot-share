// Heatmap data points generated from friends, Moments, businesses, and ambient crowd.
// Used to render Snap Map–style density layer beneath all markers.

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
  // --- Friend dots (8) ---
  { lat: 34.0705, lng: -118.4442, weight: 1 },
  { lat: 34.0678, lng: -118.4468, weight: 1 },
  { lat: 34.0692, lng: -118.4410, weight: 1 },
  { lat: 34.0661, lng: -118.4490, weight: 1 },
  { lat: 34.0720, lng: -118.4425, weight: 1 },
  { lat: 34.0648, lng: -118.4455, weight: 1 },
  { lat: 34.0715, lng: -118.4460, weight: 1 },
  { lat: 34.0668, lng: -118.4430, weight: 1 },

  // --- Moments crowds ---
  ...generateCluster(34.0698, -118.4435, 12, 0.0008), // pickup basketball
  ...generateCluster(34.0671, -118.4478, 25, 0.001),  // free concert
  ...generateCluster(34.0685, -118.4450, 6, 0.0005),  // pizza run

  // --- Busy businesses ---
  ...generateCluster(34.0701, -118.4438, 35, 0.0012), // Velvet Rooftop
  ...generateCluster(34.0695, -118.4420, 50, 0.0015), // Neon Nights (packed)
  ...generateCluster(34.0658, -118.4475, 20, 0.001),  // Koi Ramen
  ...generateCluster(34.0680, -118.4428, 15, 0.0008), // Vinyl Tap
  ...generateCluster(34.0675, -118.4462, 10, 0.0006), // The Grind Coffee

  // --- Ambient foot traffic ---
  ...generateCluster(34.0690, -118.4445, 20, 0.003),
  ...generateCluster(34.0670, -118.4460, 15, 0.002),
  ...generateCluster(34.0710, -118.4440, 10, 0.002),
];

export const HEATMAP_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: HEATMAP_POINTS.map((p) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: { weight: p.weight },
  })),
};
