// Global event bus for opening the PersonProfileModal from anywhere.

import type { PersonProfileTarget } from '@/components/PersonProfileModal';

export const OPEN_PROFILE_EVENT = 'sera:open-profile';

export function openPersonProfile(target: PersonProfileTarget) {
  window.dispatchEvent(new CustomEvent(OPEN_PROFILE_EVENT, { detail: target }));
}
