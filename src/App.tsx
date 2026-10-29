import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Earth } from './components/Earth';
import { SatPoints } from './components/SatPoints';
import { IssMarker, IssTrail, ObserverPin } from './components/IssMarker';
import { Hud } from './components/Hud';
import { DEFAULT_OBSERVER } from './lib/constants';
import { engine } from './lib/engine';

export default function App() {
  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, []);

  return (
    <div className="app">
      <Canvas
        camera={{ position: [1.75, 1.05, 1.95], fov: 42, near: 0.005, far: 400 }}
        dpr={[1, 2]}
        gl={{ antialias: true, outputColorSpace: THREE.LinearSRGBColorSpace, toneMapping: THREE.NoToneMapping }}
      >
        <color attach="background" args={['#04070f']} />

        <Stars radius={90} depth={60} count={5000} factor={2.4} saturation={0} fade speed={0.2} />

        <Suspense fallback={null}>
          <Earth />
        </Suspense>

        <SatPoints />
        <IssMarker />
        <IssTrail />
        <ObserverPin lat={DEFAULT_OBSERVER.lat} lon={DEFAULT_OBSERVER.lon} name={DEFAULT_OBSERVER.name} />

        <OrbitControls
          enablePan={false}
          minDistance={1.25}
          maxDistance={9}
          rotateSpeed={0.55}
          zoomSpeed={0.7}
          enableDamping
          dampingFactor={0.06}
        />
      </Canvas>

      <Hud />
    </div>
  );
}
