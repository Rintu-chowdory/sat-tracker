import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GROUPS } from '../lib/constants';
import { useTrackerStore } from '../store/tracker';

export function SatPoints() {
  const positions = useTrackerStore((s) => s.positions);
  const pointCount = useTrackerStore((s) => s.pointCount);
  const enabled = useTrackerStore((s) => s.enabled);
  const metas = useTrackerStore((s) => s.metas);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    return g;
  }, []);

  // Colours follow the worker's render order: GROUPS order, enabled groups only.
  useEffect(() => {
    const total = GROUPS.reduce((sum, g) => (enabled.includes(g.key) ? sum + (metas[g.key]?.length ?? 0) : sum), 0);
    if (total === 0) return;

    const colors = new Float32Array(total * 3);
    const color = new THREE.Color();
    let i = 0;
    for (const g of GROUPS) {
      if (!enabled.includes(g.key)) continue;
      color.set(g.color);
      for (let k = 0; k < (metas[g.key]?.length ?? 0); k++) {
        colors[i++] = color.r;
        colors[i++] = color.g;
        colors[i++] = color.b;
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }, [enabled, metas, geometry]);

  useEffect(() => {
    if (!positions || pointCount === 0) return;
    const existing = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;

    if (!existing || existing.count !== pointCount) {
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    } else {
      (existing.array as Float32Array).set(positions.subarray(0, pointCount * 3));
      existing.needsUpdate = true;
    }
    geometry.setDrawRange(0, pointCount);
  }, [positions, pointCount, geometry]);

  const ref = useRef<THREE.Points>(null);

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.0085}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.92}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
