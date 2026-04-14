import { useState, useEffect } from 'react';

interface UserPosition {
  latitude: number;
  longitude: number;
}

export function useUserLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      (err) => {
        setError(err.message);
        // Fallback to a default position (NYC campus area)
        setPosition({ latitude: 40.7128, longitude: -74.006 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error };
}
