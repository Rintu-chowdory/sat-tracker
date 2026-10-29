import * as THREE from 'three';

// geoToWorld from src/lib/coords.ts (identical math)
const DEG2RAD = Math.PI / 180;
function geoToWorld(latDeg, lonDeg, r) {
  const phi = (90 - latDeg) * DEG2RAD;
  const theta = (lonDeg + 180) * DEG2RAD;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

const geo = new THREE.SphereGeometry(1, 512, 256);
const pos = geo.getAttribute('position');
const uv = geo.getAttribute('uv');

function uvFor(lat, lon) {
  const target = geoToWorld(lat, lon, 1);
  let best = -1, bestD = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const d = target.distanceToSquared(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    if (d < bestD) { bestD = d; best = i; }
  }
  return { u: uv.getX(best), v: uv.getY(best), errKm: Math.sqrt(bestD) * 6378.137 };
}

for (const [name, lat, lon] of [
  ['Aachen (Europe)', 50.7753, 6.0839],
  ['Berlin', 52.52, 13.405],
  ['New York', 40.71, -74.0],
  ['Sydney', -33.87, 151.21],
  ['Greenwich', 51.48, 0.0],
]) {
  const r = uvFor(lat, lon);
  console.log(name.padEnd(18), 'u=' + r.u.toFixed(4), 'v=' + r.v.toFixed(4), 'snapErr=' + r.errKm.toFixed(0) + 'km');
}
