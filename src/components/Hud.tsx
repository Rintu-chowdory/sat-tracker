import { useEffect, useState } from 'react';
import { degreesLat, degreesLong, eciToEcf, eciToGeodetic, gstime, json2satrec, propagate } from 'satellite.js';
import { GROUPS, ISS_NORAD, DEFAULT_OBSERVER } from '../lib/constants';
import { epochAgeHours } from '../lib/celestrak';
import { engine } from '../lib/engine';
import { useTrackerStore } from '../store/tracker';

interface Telemetry {
  lat: number;
  lon: number;
  altKm: number;
  speedKmh: number;
  periodMin: number;
  inclinationDeg: number;
  tleAgeHours: number;
}

function useIssTelemetry(): Telemetry | null {
  const records = useTrackerStore((s) => s.records.stations);
  const [tel, setTel] = useState<Telemetry | null>(null);

  useEffect(() => {
    const iss = records?.find((r) => r.NORAD_CAT_ID === ISS_NORAD);
    if (!iss) {
      setTel(null);
      return;
    }

    const satrec = json2satrec(iss as never);
    const inclinationDeg = iss.INCLINATION;
    const periodMin = 1440 / iss.MEAN_MOTION;
    const tleAgeHours = epochAgeHours(iss);

    const update = () => {
      const when = new Date(engine.now());
      const pv = propagate(satrec, when);
      if (!pv?.position || !pv.velocity) return;
      const gmst = gstime(when);
      const geo = eciToGeodetic(pv.position, gmst);
      const vel = eciToEcf(pv.velocity, gmst);
      setTel({
        lat: degreesLat(geo.latitude),
        lon: degreesLong(geo.longitude),
        altKm: geo.height,
        speedKmh: Math.hypot(vel.x, vel.y, vel.z) * 3600,
        periodMin,
        inclinationDeg,
        tleAgeHours,
      });
    };

    update();
    const id = window.setInterval(update, 200);
    return () => window.clearInterval(id);
  }, [records]);

  return tel;
}

function useUtcClock() {
  const [now, setNow] = useState(() => new Date(engine.now()));
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date(engine.now())), 500);
    return () => window.clearInterval(id);
  }, []);
  return now.toISOString().slice(11, 19);
}

export function Hud() {
  const tel = useIssTelemetry();
  const utc = useUtcClock();

  const enabled = useTrackerStore((s) => s.enabled);
  const loading = useTrackerStore((s) => s.loading);
  const metas = useTrackerStore((s) => s.metas);
  const pointCount = useTrackerStore((s) => s.pointCount);
  const error = useTrackerStore((s) => s.error);
  const paused = useTrackerStore((s) => s.paused);
  const speed = useTrackerStore((s) => s.speed);
  const setPaused = useTrackerStore((s) => s.setPaused);
  const setSpeed = useTrackerStore((s) => s.setSpeed);

  return (
    <div className="hud">
      <header className="panel brand">
        <span className="live-dot" />
        <div>
          <h1>SAT TRACKER</h1>
          <p>live SGP4 · CelesTrak element sets</p>
        </div>
      </header>

      <aside className="panel iss">
        <div className="iss-head">
          <h2>ISS · Zarya</h2>
          <span className="tag">{tel ? 'tracking' : 'loading'}</span>
        </div>

        {tel ? (
          <div className="grid">
            <div>
              <label>Latitude</label>
              <strong>{tel.lat.toFixed(3)}°</strong>
            </div>
            <div>
              <label>Longitude</label>
              <strong>{tel.lon.toFixed(3)}°</strong>
            </div>
            <div>
              <label>Altitude</label>
              <strong>{tel.altKm.toFixed(1)} km</strong>
            </div>
            <div>
              <label>Velocity</label>
              <strong>{Math.round(tel.speedKmh).toLocaleString('en-US')} km/h</strong>
            </div>
          </div>
        ) : (
          <p className="muted">Fetching element sets…</p>
        )}

        {tel && (
          <div className="stats">
            <span>orbit {tel.periodMin.toFixed(1)} min</span>
            <span>inc {tel.inclinationDeg.toFixed(2)}°</span>
            <span>TLE age {tel.tleAgeHours < 1 ? '<1' : Math.round(tel.tleAgeHours)} h</span>
          </div>
        )}

        <div className="observer">
          ground station · {DEFAULT_OBSERVER.name} {DEFAULT_OBSERVER.lat.toFixed(2)}°N {DEFAULT_OBSERVER.lon.toFixed(2)}°E
        </div>
      </aside>

      <section className="panel groups">
        <h3>Layers</h3>
        {GROUPS.map((g) => {
          const isOn = enabled.includes(g.key);
          const count = metas[g.key]?.length;
          const isLoading = loading.includes(g.key);
          return (
            <button
              key={g.key}
              className={`layer${isOn ? ' on' : ''}`}
              onClick={() => engine.toggleGroup(g.key)}
              disabled={isLoading}
            >
              <span className="swatch" style={{ background: g.color }} />
              <span className="label">{g.label}</span>
              <span className="count">{isLoading ? '…' : count ?? '—'}</span>
            </button>
          );
        })}
        {error && <p className="error">{error}</p>}
      </section>

      <footer className="panel clockbar">
        <div className="clock">
          <span className="utc">{utc}</span>
          <span className="tz">UTC</span>
        </div>
        <div className="controls">
          <button onClick={() => setPaused(!paused)}>{paused ? '▶' : '❙❙'}</button>
          {[1, 10, 60].map((s) => (
            <button key={s} className={speed === s && !paused ? 'on' : ''} onClick={() => { setSpeed(s); setPaused(false); }}>
              {s}×
            </button>
          ))}
        </div>
        <div className="rendered">{pointCount.toLocaleString('en-US')} objects rendered</div>
      </footer>

      <div className="hint">drag to orbit · scroll to zoom</div>
    </div>
  );
}
