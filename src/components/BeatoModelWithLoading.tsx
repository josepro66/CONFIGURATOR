import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import MyModel from './MyModel';
import BeatoLoadingScreen from './BeatoLoadingScreen';

interface BeatoModelWithLoadingProps {
  onModelReady?: () => void;
  className?: string;
  style?: React.CSSProperties;
  minimumLoadingTime?: number; // Tiempo mínimo en ms
}

const BeatoModelWithLoading: React.FC<BeatoModelWithLoadingProps> = ({ 
  onModelReady, 
  className = '', 
  style = {},
  minimumLoadingTime = 6000 // 6 segundos mínimo
}) => {
  const [ready, setReady] = useState(false);
  const [startTime] = useState(Date.now());

  // Forzar exactamente 4 segundos de loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Tiempo mínimo de 4 segundos completado');
      setReady(true);
      onModelReady?.();
    }, minimumLoadingTime);

    return () => clearTimeout(timer);
  }, [minimumLoadingTime, onModelReady]);

  return (
    <div className={className} style={style}>
      <BeatoLoadingScreen isVisible={!ready} />
      
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        shadows
        style={{ 
          width: '100%', 
          height: '100%',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.8s ease-in-out'
        }}
      >
        {/* Iluminación profesional */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Modelo usando el componente MyModel */}
        <MyModel onReady={() => console.log('Modelo cargado')} />

        {/* Controles de cámara */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
};

export default BeatoModelWithLoading;
