import { gstime, json2satrec, propagate } from 'satellite.js';

// CelesTrak throttles repeated downloads, so clone one healthy element set to
// measure the SGP4 cost that actually dominates a tick.
const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json');
const records = await res.json();
const template = records.find((r) => r.NORAD_CAT_ID === 25544);
const N = 11132;
const satrecs = Array.from({ length: N }, () => json2satrec(template));

const date = new Date();
const gmst = gstime(date);
const c = Math.cos(gmst), s = Math.sin(gmst);
const out = new Float32Array(N * 3);

for (let i = 0; i < 200; i++) propagate(satrecs[i], date);

const t0 = performance.now();
let written = 0;
for (let i = 0; i < N; i++) {
  const pv = propagate(satrecs[i], date);
  if (!pv?.position) continue;
  const { x, y, z } = pv.position;
  out[written * 3] = (x * c + y * s) / 6378.137;
  out[written * 3 + 1] = z / 6378.137;
  out[written * 3 + 2] = -(-x * s + y * c) / 6378.137;
  written++;
}
const t1 = performance.now();
const ms = t1 - t0;
console.log(`propagated ${written} satellites in ${ms.toFixed(1)} ms => max ${(1000 / ms).toFixed(1)} Hz, ${(ms / written * 1000).toFixed(2)} µs/sat`);
