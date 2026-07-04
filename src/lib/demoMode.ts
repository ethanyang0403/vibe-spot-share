// Global DEMO_MODE flag — persisted in localStorage, subscribable via event.
// DEMO_MODE ON  → rich seeded universe (default)
// DEMO_MODE OFF → hide merchant pins/deals, heatmap, "People You May Know"

import { useEffect, useState } from 'react';

const KEY = 'sera:demo-mode';
const EVENT = 'sera:demo-mode-change';

export function getDemoMode(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(KEY);
  if (raw === null) return true; // default ON
  return raw === '1';
}

export function setDemoMode(on: boolean) {
  window.localStorage.setItem(KEY, on ? '1' : '0');
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { on } }));
}

export function useDemoMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => getDemoMode());
  useEffect(() => {
    const handler = () => setOn(getDemoMode());
    window.addEventListener(EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return [on, (v: boolean) => setDemoMode(v)];
}

// Brandeis campus map center + default zoom
export const BRANDEIS_CENTER = { latitude: 42.3656, longitude: -71.2587 };
export const BRANDEIS_ZOOM = 15.8;
