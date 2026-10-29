# Satellite & ISS Tracker

A live 3D satellite tracker in the browser: a day/night-lit globe, the ISS with its
current ground track, and thousands of satellites propagated with real SGP4 orbital
mechanics. No backend, no API key.

**Live:** https://sat-tracker-seven.vercel.app

![stack](https://img.shields.io/badge/React-19-61dafb?style=flat-square) ![stack](https://img.shields.io/badge/three.js-r186-000?style=flat-square) ![stack](https://img.shields.io/badge/satellite.js-6.0.2-6a5acd?style=flat-square)

## What it does

- **Real orbits, not decoration.** Element sets come from CelesTrak and are propagated
  with SGP4 (`satellite.js`) in a Web Worker, so positions are astronomically correct
  for the selected instant.
- **Day/night terminator from the actual sun position.** The Earth is a fixed
  (non-spinning) mesh in earth-fixed coordinates; satellites move across it.
- **ISS telemetry panel**: latitude, longitude, altitude, velocity, orbital period,
  inclination and the age of the element set.
- **Layer toggles** for stations, Starlink, GPS, weather and the full active catalog,
  colour-coded and rendered in a single draw call.
- **Time controls**: pause and 1x / 10x / 60x playback.

## How it works

```
CelesTrak gp.php?FORMAT=json  (OMM JSON, CORS enabled, cached 2h)
        |
        v
 json2satrec  ->  Web Worker @ 5 Hz  ->  SGP4 propagate(t)
        |                                      |
        |                            ECI -> ECEF (rotate by GMST)
        |                                      |
        |                            ECEF -> world (x, z, -y) * 1/6378.137
        v                                      v
    React state  <---  transferable Float32Array  --->  BufferGeometry
```

Design notes:

- **ECEF everywhere.** The globe never rotates. Keeping satellites and ground points in
  one earth-fixed frame removes the classic GMST/rotation desync bug entirely.
- **The clock owns time.** One simulation instant lives in the engine; `useFrame` reads
  `engine.now()` so a 60 Hz clock never re-renders React. The worker gets a tick 5x/sec
  and posts a transferable `Float32Array` straight into the geometry.
- **Measured cost:** 3.6 µs per satellite per tick, i.e. 11,132 Starlink objects in
  ~40 ms. That is why propagation lives off the main thread.
- **CelesTrak etiquette:** one download per group every 2 hours (their refresh cycle),
  cached in `localStorage` with a stale-cache fallback. A `403 has not updated` reply is
  treated as "keep using the cache", not as an error.

## Verification

`scripts/verify-sgp4.mjs` propagates the ISS and compares it with an independent
service: latitude/longitude agree to within 0.03°, altitude exactly (417.9 km) and
velocity 27,594 km/h. `scripts/perf.mjs` re-measures the propagation budget.
`scripts/check-uv.mjs` proves the equirectangular texture is aligned: Aachen, Berlin
and Greenwich sample as land, mid-Pacific as ocean.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run preview
```

## Deployment

Vercel, deployed automatically from `main` by `.github/workflows/vercel-deploy.yml`
(official Vercel CLI, prebuilt artifacts). CI runs typecheck and build on every push
and pull request.

## Roadmap

- [x] Globe, terminator, ISS marker and ground track, live panel
- [x] Layer toggles, single draw call for 16k+ objects, time controls
- [ ] Click or search a satellite: orbit line, footprint, full element details
- [ ] ISS pass predictions for a chosen ground station (default: Aachen)
- [ ] Satellite trail history and visibility (eclipse) flag

## Data & credits

Orbital element sets: [CelesTrak](https://celestrak.org) (Dr. T.S. Kelso).
Propagation: [satellite.js](https://github.com/shashwatak/satellite-js).
Earth imagery: NASA Blue Marble and Black Marble, distributed via `three-globe`.

MIT licensed.
