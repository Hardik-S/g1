import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

const SHARE_LIMIT = 2000; // bytes, requirement from spec

export const encodeRoomForShare = (room) => {
  const payload = JSON.stringify({ version: 1, room });
  const compressed = compressToEncodedURIComponent(payload);
  if (compressed.length > SHARE_LIMIT) {
    throw new Error(
      `Share payload is ${compressed.length} bytes; reduce notes or lists to stay under 2KB.`
    );
  }
  return compressed;
};

export const decodeSharedRoom = (token) => {
  if (!token) return null;
  try {
    const restored = decompressFromEncodedURIComponent(token);
    if (!restored) return null;
    const parsed = JSON.parse(restored);
    if (!parsed || parsed.version !== 1 || !parsed.room) return null;
    return parsed.room;
  } catch (error) {
    console.warn('[Namecraft] Failed to decode shared room', error);
    return null;
  }
};

export const buildShareUrl = (token) => {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
  const hash = `#/apps/namecraft?share=${token}`;
  return `${base}${hash}`;
};

export const getShareLimit = () => SHARE_LIMIT;
