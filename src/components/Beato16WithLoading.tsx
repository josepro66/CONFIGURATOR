import React, { useState, useEffect } from 'react';
import Beato16LoadingScreen from './Beato16LoadingScreen';
import Beato16Configurator from '../Beato16Configurator';

interface Beato16WithLoadingProps {
  className?: string;
  style?: React.CSSProperties;
}

const Beato16WithLoading: React.FC<Beato16WithLoadingProps> = ({
  className = '',
  style = {}
}) => {
  const [ready, setReady] = useState(false);
  const [startTime] = useState(Date.now());

  // Forzar exactamente 4.1 segundos de loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Tiempo mínimo de 4.1 segundos completado para BEATO16');
      setReady(true);
    }, 4100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={className} style={style}>
      <Beato16LoadingScreen isVisible={!ready} />

      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: ready ? 1 : 0
        }}
      >
        <Beato16Configurator />
      </div>
    </div>
  );
};

export default Beato16WithLoading;
