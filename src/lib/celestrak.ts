import { EARTH_MU, EARTH_RADIUS_KM, GROUPS, type GroupKey } from './constants';
import type { OmmRecord, SatMeta } from './types';

const CACHE_PREFIX = 'sattracker:v1:';
const TTL_MS = 2 * 60 * 60 * 1000; // CelesTrak asks for at most one refresh per 2h

interface CacheEntry {
  ts: number;
  records: OmmRecord[];
}

function readCache(group: GroupKey): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + group);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!Array.isArray(parsed.records)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(group: GroupKey, records: OmmRecord[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + group, JSON.stringify({ ts: Date.now(), records }));
  } catch {
    /* quota exceeded: not fatal, we just lose the cache */
  }
}

function endpoint(group: GroupKey) {
  const def = GROUPS.find((g) => g.key === group);
  if (!def) throw new Error(`Unknown group ${group}`);
  return `https://celestrak.org/NORAD/elements/gp.php?GROUP=${def.query}&FORMAT=json`;
}

export async function loadGroup(group: GroupKey, opts: { force?: boolean } = {}): Promise<OmmRecord[]> {
  const cached = readCache(group);
  const fresh = cached && Date.now() - cached.ts < TTL_MS;
  if (cached && fresh && !opts.force) return cached.records;

  try {
    const res = await fetch(endpoint(group));
    if (!res.ok) {
      // CelesTrak answers 403 with a plain-text note when the group has not been
      // refreshed since our last download (element sets update every 2h).
      const text = await res.text().catch(() => '');
      if (res.status === 403 && /has not updated/i.test(text)) {
        throw new Error(`${group}: CelesTrak has no newer element sets yet (updates every 2h)`);
      }
      throw new Error(`${group}: CelesTrak responded ${res.status}`);
    }
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) throw new Error(`CelesTrak returned no GP data for ${group}`);
    const records = data as OmmRecord[];
    writeCache(group, records);
    return records;
  } catch (err) {
    // Network hiccup or rate limit: a stale cache is far better than an empty globe.
    if (cached) return cached.records;
    throw err;
  }
}

/** CelesTrak EPOCH strings are UTC but carry no timezone designator. */
export function parseEpoch(epoch: string): number {
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(epoch) ? epoch : `${epoch}Z`;
  return Date.parse(iso);
}

export function toMeta(rec: OmmRecord, group: GroupKey): SatMeta {
  const nRadPerSec = (rec.MEAN_MOTION * 2 * Math.PI) / 86400;
  const a = Math.cbrt(EARTH_MU / (nRadPerSec * nRadPerSec));
  const e = rec.ECCENTRICITY;
  return {
    noradId: rec.NORAD_CAT_ID,
    name: rec.OBJECT_NAME.trim(),
    group,
    inclinationDeg: rec.INCLINATION,
    periodMin: 1440 / rec.MEAN_MOTION,
    apogeeKm: a * (1 + e) - EARTH_RADIUS_KM,
    perigeeKm: a * (1 - e) - EARTH_RADIUS_KM,
    epochMs: parseEpoch(rec.EPOCH),
  };
}

export function epochAgeHours(rec: OmmRecord): number {
  const ms = parseEpoch(rec.EPOCH);
  if (!Number.isFinite(ms)) return 0;
  return (Date.now() - ms) / 3600000;
}
