import * as THREE from 'three';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// One colour pipeline everywhere: sRGB hex values and sRGB textures pass straight
// through to the framebuffer, so the custom Earth shader needs no encode step.
THREE.ColorManagement.enabled = false;

createRoot(document.getElementById('root')!).render(<App />);
