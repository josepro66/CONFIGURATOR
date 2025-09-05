import React, { useState, useEffect } from 'react';
import FadoLoadingScreen from './FadoLoadingScreen';
import FadoConfigurator from '../FadoConfigurator';

interface FadoWithLoadingProps {
  className?: string;
  style?: React.CSSProperties;
}

const FadoWithLoading: React.FC<FadoWithLoadingProps> = ({
  className = '',
  style = {}
}) => {
  const [ready, setReady] = useState(false);
  const [startTime] = useState(Date.now());

  // Forzar exactamente 4.1 segundos de loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Tiempo mínimo de 4.1 segundos completado para FADO');
      setReady(true);
    }, 4100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={className} style={style}>
      <FadoLoadingScreen isVisible={!ready} />

      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: ready ? 1 : 0
        }}
      >
        <FadoConfigurator />
      </div>
    </div>
  );
};

export default FadoWithLoading;
