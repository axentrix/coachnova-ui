import type { NextApiRequest, NextApiResponse } from 'next';

const SERVICES = [
  'https://ipapi.co/json/',
  'https://ipwhois.app/json/',
  'https://extreme-ip-lookup.com/json/'
];

// Simple in-memory cache to avoid hammering upstream geo services during development
let _lastGeo: { ts: number; result: any } | null = null;

async function fetchWithTimeout(url: string, timeout = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return cached result for 5 minutes to avoid repeated external calls
  try {
    const now = Date.now();
    if (_lastGeo && now - _lastGeo.ts < 5 * 60 * 1000) {
      return res.status(200).json({ cached: true, ..._lastGeo.result });
    }

    for (const s of SERVICES) {
      try {
        const data = await fetchWithTimeout(s, 4000);
        if (data) {
          const country_name = data.country_name || data.country || data.countryName || data.countryFull || '';
          const result = { source: s, country_name, raw: data };
          _lastGeo = { ts: now, result };
          return res.status(200).json(result);
        }
      } catch (err) {
        // Log and continue to next provider
        // eslint-disable-next-line no-console
        console.warn('geo service failed', s, err instanceof Error ? err.message : err);
        continue;
      }
    }

    // All services failed — return safe empty response (200) so client can continue
    const fallback = { source: 'none', country_name: '', raw: null };
    _lastGeo = { ts: now, result: fallback };
    return res.status(200).json(fallback);
  } catch (e) {
    // Final safety net
    // eslint-disable-next-line no-console
    console.error('Unexpected geo handler error', e);
    return res.status(200).json({ source: 'none', country_name: '' });
  }
}
