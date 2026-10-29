import { gstime } from 'satellite.js';
import { DEG2RAD } from './constants';

export interface EcefVector {
  x: number;
  y: number;
  z: number;
}

/**
 * Low-precision solar direction in ECEF (unit vector).
 * Good to ~0.01 deg, which is ample for a terminator shading.
 */
export function sunVectorEcef(date: Date): EcefVector {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) * DEG2RAD;
  const g = (357.528 + 0.9856003 * n) * DEG2RAD;
  const lambda = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG2RAD;
  const eps = (23.439 - 0.0000004 * n) * DEG2RAD;

  const xEci = Math.cos(lambda);
  const yEci = Math.cos(eps) * Math.sin(lambda);
  const zEci = Math.sin(eps) * Math.sin(lambda);

  const gmst = gstime(date);
  const c = Math.cos(gmst);
  const s = Math.sin(gmst);
  return { x: xEci * c + yEci * s, y: -xEci * s + yEci * c, z: zEci };
}

/** Subsolar point, handy for verifying the sun model (compare with any sun tracker). */
export function subsolarPoint(date: Date) {
  const v = sunVectorEcef(date);
  const lat = Math.asin(v.z) * (180 / Math.PI);
  const lon = Math.atan2(v.y, v.x) * (180 / Math.PI);
  return { lat, lon };
}
