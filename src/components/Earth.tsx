import { useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { engine } from '../lib/engine';
import { ecfToWorld } from '../lib/coords';
import { sunVectorEcef } from '../lib/sun';

const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;

  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFragment = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDir;

  varying vec2 vUv;
  varying vec3 vNormalW;

  void main() {
    vec3 n = normalize(vNormalW);
    float lambert = dot(n, normalize(sunDir));

    // soft, slightly wide terminator so city lights fade in before full darkness
    float dayMix = smoothstep(-0.18, 0.22, lambert);

    vec3 dayCol = texture2D(dayMap, vUv).rgb * (0.55 + 0.55 * clamp(lambert, 0.0, 1.0));
    vec3 nightCol = texture2D(nightMap, vUv).rgb * 1.6;
    vec3 col = mix(nightCol, dayCol, dayMix);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const glowVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const glowFragment = /* glsl */ `
  uniform vec3 glowColor;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 2.6);
    gl_FragColor = vec4(glowColor * rim, rim * 0.7);
  }
`;

export function Earth() {
  const [dayTex, nightTex] = useLoader(THREE.TextureLoader, [
    '/textures/earth-day.jpg',
    '/textures/earth-night.jpg',
  ]);

  const uniforms = useMemo(
    () => ({
      dayMap: { value: dayTex },
      nightMap: { value: nightTex },
      sunDir: { value: new THREE.Vector3(1, 0, 0) },
    }),
    [dayTex, nightTex],
  );

  const glowUniforms = useMemo(() => ({ glowColor: { value: new THREE.Color('#3ea6ff') } }), []);

  useEffect(() => {
    // Colour management is disabled app-wide, so textures stay in their native sRGB
    // bytes and the shader passes them through untouched.
    dayTex.anisotropy = 8;
    nightTex.anisotropy = 8;
  }, [dayTex, nightTex]);

  const sunWorld = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);

  useFrame(() => {
    const sun = sunVectorEcef(new Date(engine.now()));
    ecfToWorld(sun.x, sun.y, sun.z, sunWorld);
    uniforms.sunDir.value.set(sunWorld.x, sunWorld.y, sunWorld.z).normalize();
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 160, 120]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={earthVertex}
          fragmentShader={earthFragment}
        />
      </mesh>

      {/* atmosphere rim */}
      <mesh scale={1.035}>
        <sphereGeometry args={[1, 96, 64]} />
        <shaderMaterial
          uniforms={glowUniforms}
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
