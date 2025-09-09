import React, { useState, useEffect } from 'react';
import BeatoLoadingScreen from './BeatoLoadingScreen';
import BeatoConfigurator from '../BeatoConfigurator';

interface Beato8WithLoadingProps {
  className?: string;
  style?: React.CSSProperties;
}

const Beato8WithLoading: React.FC<Beato8WithLoadingProps> = ({
  className = '',
  style = {}
}) => {
  const [ready, setReady] = useState(false);
  const [startTime] = useState(Date.now());

  // Forzar exactamente 1 segundo de loading para desarrollo
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Tiempo mínimo de 1 segundo completado para BEATO8');
      setReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={className} style={style}>
      <BeatoLoadingScreen isVisible={!ready} />

      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: ready ? 1 : 0
        }}
      >
        <BeatoConfigurator />
      </div>
    </div>
  );
};

export default Beato8WithLoading;
