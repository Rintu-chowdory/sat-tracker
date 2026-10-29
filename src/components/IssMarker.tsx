import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gstime, json2satrec, propagate } from 'satellite.js';
import { ISS_NORAD } from '../lib/constants';
import { engine } from '../lib/engine';
import { ecfToWorld } from '../lib/coords';
import { useTrackerStore } from '../store/tracker';

const TRAIL_SEGMENTS = 200;
const TRAIL_REBUILD_MS = 15_000;

function useIssRecord() {
  const records = useTrackerStore((s) => s.records.stations);
  return useMemo(() => records?.find((r) => r.NORAD_CAT_ID === ISS_NORAD), [records]);
}

/** Full-orbit ground track of the ISS, in earth-fixed space. */
export function IssTrail() {
  const iss = useIssRecord();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_SEGMENTS * 3), 3));
    return g;
  }, []);

  const lastBuild = useRef(-Infinity);

  const build = useMemo(() => {
    return () => {
      if (!iss) return;
      const satrec = json2satrec(iss as never);
      const periodMs = (1440 / iss.MEAN_MOTION) * 60_000;
      const now = engine.now();
      const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const point = { x: 0, y: 0, z: 0 };

      for (let i = 0; i < TRAIL_SEGMENTS; i++) {
        const when = new Date(now - periodMs / 2 + (periodMs * i) / (TRAIL_SEGMENTS - 1));
        const pv = propagate(satrec, when);
        if (!pv?.position) {
          arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = 0;
          continue;
        }
        const gmst = gstime(when);
        const c = Math.cos(gmst);
        const s = Math.sin(gmst);
        const ex = pv.position.x * c + pv.position.y * s;
        const ey = -pv.position.x * s + pv.position.y * c;
        ecfToWorld(ex, ey, pv.position.z, point);
        arr[i * 3] = point.x;
        arr[i * 3 + 1] = point.y;
        arr[i * 3 + 2] = point.z;
      }

      attr.needsUpdate = true;
      lastBuild.current = now;
    };
  }, [iss, geometry]);

  useEffect(() => {
    build();
  }, [build]);

  useFrame(() => {
    if (!iss) return;
    if (Math.abs(engine.now() - lastBuild.current) > TRAIL_REBUILD_MS) build();
  });

  return (
    <primitive
      object={
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({ color: '#5ee9ff', transparent: true, opacity: 0.45, depthWrite: false }),
        )
      }
    />
  );
}

export function IssMarker() {
  const iss = useIssRecord();
  const groupRef = useRef<THREE.Group>(null);

  const satrec = useMemo(() => (iss ? json2satrec(iss as never) : null), [iss]);
  const point = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !satrec) return;
    const when = new Date(engine.now());
    const pv = propagate(satrec, when);
    if (!pv?.position) return;
    const gmst = gstime(when);
    const c = Math.cos(gmst);
    const s = Math.sin(gmst);
    const ex = pv.position.x * c + pv.position.y * s;
    const ey = -pv.position.x * s + pv.position.y * c;
    ecfToWorld(ex, ey, pv.position.z, point);
    group.position.set(point.x, point.y, point.z);
    group.visible = true;
  });

  if (!iss) return null;

  return (
    <group ref={groupRef} visible={false}>
      <mesh>
        <sphereGeometry args={[0.0075, 16, 16]} />
        <meshBasicMaterial color="#aef6ff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.019, 16, 16]} />
        <meshBasicMaterial color="#5ee9ff" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Aachen ground station: doubles as a visual check that the texture is aligned. */
export function ObserverPin({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const position = useMemo(() => {
    const p = { x: 0, y: 0, z: 0 };
    const DEG2RAD = Math.PI / 180;
    const r = 1.002;
    const phi = (90 - lat) * DEG2RAD;
    const theta = (lon + 180) * DEG2RAD;
    p.x = -r * Math.sin(phi) * Math.cos(theta);
    p.y = r * Math.cos(phi);
    p.z = r * Math.sin(phi) * Math.sin(theta);
    return p;
  }, [lat, lon]);

  return (
    <group position={[position.x, position.y, position.z]} ref={(g) => {
        g?.lookAt(0, 0, 0);
      }}>
      <mesh>
        <sphereGeometry args={[0.006, 12, 12]} />
        <meshBasicMaterial color="#ff8a5c" />
      </mesh>
      <mesh>
        <ringGeometry args={[0.016, 0.02, 32]} />
        <meshBasicMaterial color="#ff8a5c" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
