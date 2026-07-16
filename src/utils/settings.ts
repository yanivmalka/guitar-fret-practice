export function loadSetting<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
export function saveSetting(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
