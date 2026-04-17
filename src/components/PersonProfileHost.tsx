// Mounts PersonProfileModal once at app level and listens for open events.

import { useEffect, useState } from 'react';
import PersonProfileModal, { type PersonProfileTarget } from './PersonProfileModal';
import { OPEN_PROFILE_EVENT } from '@/lib/profileBus';

export default function PersonProfileHost() {
  const [target, setTarget] = useState<PersonProfileTarget | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PersonProfileTarget>).detail;
      setTarget(detail);
    };
    window.addEventListener(OPEN_PROFILE_EVENT, handler);
    return () => window.removeEventListener(OPEN_PROFILE_EVENT, handler);
  }, []);

  return <PersonProfileModal target={target} onClose={() => setTarget(null)} />;
}
