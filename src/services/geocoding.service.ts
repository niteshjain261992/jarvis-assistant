import { env } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

interface NominatimAddress {
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

function buildCompactName(response: NominatimResponse): string | null {
  const addr = response.address;
  if (addr) {
    const parts = [
      addr.neighbourhood ?? addr.suburb,
      addr.city ?? addr.town ?? addr.village,
      addr.state,
    ].filter((p): p is string => Boolean(p));

    if (parts.length > 0) return parts.join(', ');
  }
  return response.display_name ?? null;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = `${env.NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lon}&format=json`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'jarvis-personal-assistant' },
    });
    if (!response.ok) {
      logger.error({ status: response.status, lat, lon }, 'Nominatim returned non-200 status');
      return null;
    }
    const data = (await response.json()) as NominatimResponse;
    return buildCompactName(data);
  } catch (err) {
    logger.error({ err, lat, lon }, 'Reverse geocoding failed');
    return null;
  }
}
