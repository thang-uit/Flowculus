'use client';

import { create } from 'zustand';

import type { Locale } from '@/lib/i18n/types';

interface PreferencesState {
  locale: Locale;
  minimapVisible: boolean;
  setMinimapVisible: (visible: boolean) => void;
  setLocale: (locale: Locale) => void;
}

/** Small shared preference store; reading pages do not load the editor engine. */
export const usePreferencesStore = create<PreferencesState>((set) => ({
  locale: 'en',
  minimapVisible: true,
  setMinimapVisible: (minimapVisible) => {
    set({ minimapVisible });
    try {
      window.localStorage.setItem('flowculus-minimap', String(minimapVisible));
    } catch {
      // Optional view settings remain usable when browser storage is blocked.
    }
  },
  setLocale: (locale) => {
    set({ locale });
    if (typeof window === 'undefined') return;
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem('flowculus-locale', locale);
    } catch {
      // Language changes still work when optional preference storage is blocked.
    }
  },
}));

export function restoreLocalePreference() {
  try {
    const map = window.localStorage.getItem('flowculus-minimap');
    if (map === 'true' || map === 'false')
      usePreferencesStore.setState({ minimapVisible: map === 'true' });
    const saved = window.localStorage.getItem('flowculus-locale');
    if (saved === 'vi' || saved === 'en') usePreferencesStore.getState().setLocale(saved);
  } catch {
    // Keep the default language if browser preference storage is unavailable.
  }
}
