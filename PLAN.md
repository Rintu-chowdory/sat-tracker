# Satellite & ISS Tracker — Build Plan

Status: planning complete, not yet scaffolded. Owner: Rintu Chowdory.

## Decisions (resolved with evidence)

1. **Globe: start fresh.** No reusable 3D globe exists in his repos. The only
   `Globe.tsx` (Rintu-chowdory/earthgpt-republish, client/src/components/Globe.tsx,
   157 lines) is a 2D canvas drawing: linear gradient sky, random dots as stars,
   one `arc()` circle for Earth and two `ellipse()` blobs as continents. Nothing to port.
2. **No backend for the MVP.** `celestrak.org/NORAD/elements/gp.php?...&FORMAT=json`
   sends `access-control-allow-origin: *` and returns JSON, so the browser fetches
   TLEs directly. The FastAPI/Render proxy is dropped from MVP; revisit only if
   CelesTrak rate-limits us.
3. **wheretheiss.at is not a usable browser fallback.** It returns 200 from curl but
   **401 Authorization Required** as soon as a browser `Origin` header is present.
   Use SGP4 from CelesTrak as the single source of truth; wheretheiss.at only for
   offline sanity checks in a test script.

## Measured scale (2026-10-29)

| group | objects |
|---|---|
| active | 16,819 |
| starlink | 11,132 |
| stations | 20 |
| gps-ops | 32 |
| weather | 74 |

=> `Points` / `InstancedMesh` is mandatory. Orbit trails are computed only for the
selected object, never for the whole set.

## Data layer

- `gp.php?GROUP=<g>&FORMAT=json` returns **OMM JSON** (`EPOCH`, `MEAN_MOTION`,
  `BSTAR`, `NORAD_CAT_ID`, ...), not 2-line elements. Use `json2satrec` from
  satellite.js instead of writing a TLE parser.
- Fetch `stations` + `active` on load; fetch `starlink` lazily on toggle.
- Cache in `localStorage` with a 2h TTL, plus `If-Modified-Since`/ETag when present.
- Track TLE epoch age; show a staleness badge after 24h (Starlink elements decay fast).

## Coordinate spine (the part that usually breaks)

Everything lives in **ECEF / earth-fixed** space, and the Earth mesh does not spin.

```
satrec --propagate(date)--> ECI position (km)
       --eciToEcf(pos, gSatConst.gmst(date))--> ECEF
       --eciToGeodetic(...)--> lat / lon / heightKm
       --unit vector(lat,lon) * (RE + heightKm) * SCALE--> three.js world position
```

- Earth radius `RE = 6378.137 km`, world globe radius `1` => `SCALE = 1/6378.137`.
- Camera orbits; the planet is static. This removes an entire class of
  Earth-rotation desync bugs.
- `THREE.Vector3` is Y-up: `x = cos(lat)cos(lon)`, `y = sin(lat)`, `z = -cos(lat)sin(lon)`
  (negated z so the texture mapping matches `SphereGeometry` UVs, verified visually in M1).

## Time model

Single `t` (ms epoch) in a zustand store, advanced by the rAF loop.
Pause / speed / scrub only mutate `t` — no component holds its own clock.

## Performance

- SGP4 costs roughly 5–10 µs per call, so 16.8k objects is ~100 ms: far too slow on
  the main thread.
- Web Worker receives `{t}` at 5 Hz, propagates, and posts back a transferable
  `Float32Array` of xyz (16.8k * 3 * 4 B ≈ 200 KB per tick) written straight into the
  geometry's `position` attribute.
- Selected satellite: propagated on the main thread every frame for a smooth marker;
  its orbit line is sampled at ~120 points per period and only recomputed when `t`
  moves more than ~2 s of orbital time.
- Single `Points` draw call with a per-vertex color attribute for group coloring.

## Pass prediction

Observer (geolocation, default Aachen 50.7753 N, 6.0839 E), 48 h horizon, 30 s step
(5,760 propagations, runs in the worker in well under a second). Keep passes where
elevation > 10°, report start / max elevation / duration; mark visible-at-night passes
using a simple solar position check.

## Milestones

- **M0** Vite + React + TS + r3f scaffold, dark shell, Earth sphere with blue-marble
  and night textures, starfield, orbit controls. *Done when the globe renders at 60fps.*
- **M1** CelesTrak fetch + `json2satrec` + worker propagation; ISS marker, live
  lat/lon/alt/velocity panel. *Done when the ISS subpoint matches an independent check.*
- **M2** Group toggles (stations / starlink / gps / weather / active), color coding,
  single-draw-call rendering of 16.8k points.
- **M3** Click/search a satellite: orbit line, ground track, details (NORAD ID,
  altitude, velocity, inclination, period), camera focus.
- **M4** Time controls: pause, 1x/10x/60x, scrub slider, live/paused indicator.
- **M5** Pass predictions for the observer location with a visibility flag.
- **Later** day/night terminator, ISS crew panel, satellite footprints.

## Stack (versions verified on npm, 2026-10-29)

three 0.186.1 · @react-three/fiber 9.8.2 · @react-three/drei 10.7.9 · satellite.js 7.1.0

Textures (verified 200 via unpkg): `three-globe/example/img/earth-blue-marble.jpg`,
`earth-night.jpg`, `earth-topology.png`.

## Working assumptions

- Repo `Rintu-chowdory/sat-tracker`, public, MIT, same CI + Cloudflare Pages deploy
  pattern as behoerdenhelfer.
- Dark UI, English labels at first, German toggle later (matches his other projects).
