import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import MyModel from './MyModel';

interface BeatoModelExampleProps {
  onModelReady?: () => void;
}

const BeatoModelExample: React.FC<BeatoModelExampleProps> = ({ onModelReady }) => {
  const [isModelReady, setIsModelReady] = useState(false);

  const handleModelReady = () => {
    console.log('Modelo BEATO3.glb cargado y listo');
    setIsModelReady(true);
    onModelReady?.();
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        shadows
      >
        {/* Iluminación */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Modelo usando el componente MyModel */}
        <MyModel onReady={handleModelReady} />

        {/* Controles de cámara */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>

      {/* Indicador de estado */}
      {!isModelReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '18px',
          zIndex: 1000
        }}>
          Cargando modelo...
        </div>
      )}
    </div>
  );
};

export default BeatoModelExample;
