'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return typeof window !== 'undefined' && window.self !== window.top;
}

function getServerSnapshot() {
  return false;
}

/** True when this page is loaded inside the Career Services dashboard iframe. */
export function useDashboardEmbed() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
