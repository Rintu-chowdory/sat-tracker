import { DEG2RAD, SCALE } from './constants';

/**
 * ECEF (X -> lon 0, Y -> lon 90E, Z -> north pole) to three.js world space.
 * The mapping (x, z, -y) keeps the frame right-handed and keeps ECEF aligned with
 * the default equirectangular sphere UVs, so the Earth mesh never has to spin.
 */
export function ecfToWorld(x: number, y: number, z: number, out: { x: number; y: number; z: number }) {
  out.x = x * SCALE;
  out.y = z * SCALE;
  out.z = -y * SCALE;
  return out;
}

/**
 * Geodetic lat/lon/height to world space. Equivalent to ecfToWorld on a converted
 * lat/lon, kept as the readable path for ground points (observer, subpoints).
 */
export function geoToWorld(latDeg: number, lonDeg: number, heightKm: number, out: { x: number; y: number; z: number }) {
  const r = 1 + heightKm * SCALE;
  const phi = (90 - latDeg) * DEG2RAD;
  const theta = (lonDeg + 180) * DEG2RAD;
  out.x = -r * Math.sin(phi) * Math.cos(theta);
  out.y = r * Math.cos(phi);
  out.z = r * Math.sin(phi) * Math.sin(theta);
  return out;
}
