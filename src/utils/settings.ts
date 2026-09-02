import { isSyncedKey, cloudPushSettings } from './settingsSync';

export function loadSetting<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
export function saveSetting(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  // Mirror selector/preference changes to the cloud for signed-in users
  // (debounced, best-effort, no-op for guests/offline).
  if (isSyncedKey(key)) cloudPushSettings();
}
