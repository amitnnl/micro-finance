import api from './api';

// In-memory cache for instant PIN code lookups
const pincodeCache = new Map();

/**
 * Lookup Indian PIN Code to get District, State, and City/Post Offices.
 * 1. Checks memory cache
 * 2. Attempts direct client-side fetch from public India Post API (CORS enabled)
 * 3. Falls back to backend proxy endpoint (`pincode/lookup`)
 * 
 * @param {string|number} pincode - 6-digit Indian PIN code
 * @returns {Promise<{district: string, state: string, city: string, offices: string[], pincode: string}|null>}
 */
export async function lookupPincode(pincode) {
  const cleanPin = String(pincode || '').replace(/\D/g, '').trim();
  if (cleanPin.length !== 6) return null;

  if (pincodeCache.has(cleanPin)) {
    return pincodeCache.get(cleanPin);
  }

  // 1. Direct fetch from India Post API (fast & client-side)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice;
        const first = po[0];
        const result = {
          pincode: cleanPin,
          district: first.District || '',
          state: first.State || '',
          city: first.Block || first.Name || '',
          offices: Array.from(new Set(po.map((p) => p.Name).filter(Boolean))).slice(0, 15)
        };
        pincodeCache.set(cleanPin, result);
        return result;
      }
    }
  } catch (err) {
    // If client fetch is blocked or offline, fall through to backend endpoint
  }

  // 2. Fallback to internal backend endpoint
  try {
    const res = await api.get(`pincode/lookup?pincode=${cleanPin}`);
    if (res?.success && res?.data) {
      pincodeCache.set(cleanPin, res.data);
      return res.data;
    }
  } catch (err) {
    console.warn('Backend PIN code lookup fallback failed:', err);
  }

  return null;
}
