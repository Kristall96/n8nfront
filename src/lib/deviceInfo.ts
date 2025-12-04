// src/lib/deviceInfo.ts
let cachedDeviceId: string | null = null;
let cachedLabel: string | null = null;

const ID_KEY = 'gm_device_id';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildLabel() {
  if (typeof navigator === 'undefined') return 'Unknown device';
  const ua = navigator.userAgent || '';

  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS device';
  if (/Android/i.test(ua)) return 'Android device';
  if (/Windows NT/i.test(ua)) return 'Windows desktop';
  if (/Mac OS X/i.test(ua)) return 'macOS desktop';
  if (/Linux/i.test(ua)) return 'Linux desktop';

  return 'Unknown device';
}

export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return { deviceId: null as string | null, deviceLabel: 'SSR' };
  }

  if (!cachedDeviceId) {
    const existing = window.localStorage.getItem(ID_KEY);
    if (existing) {
      cachedDeviceId = existing;
    } else {
      cachedDeviceId = generateId();
      window.localStorage.setItem(ID_KEY, cachedDeviceId);
    }
  }

  if (!cachedLabel) {
    cachedLabel = buildLabel();
  }

  return { deviceId: cachedDeviceId, deviceLabel: cachedLabel };
}
