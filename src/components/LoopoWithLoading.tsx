import React, { useState, useEffect } from 'react';
import LoopoLoadingScreen from './LoopoLoadingScreen';
import LoopoConfigurator from '../LoopoConfigurator';

interface LoopoWithLoadingProps {
  className?: string;
  style?: React.CSSProperties;
}

const LoopoWithLoading: React.FC<LoopoWithLoadingProps> = ({
  className = '',
  style = {}
}) => {
  const [ready, setReady] = useState(false);
  const [startTime] = useState(Date.now());

  // Forzar exactamente 4.1 segundos de loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Tiempo mínimo de 4.1 segundos completado para LOOPO');
      setReady(true);
    }, 4100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={className} style={style}>
      <LoopoLoadingScreen isVisible={!ready} />

      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: ready ? 1 : 0
        }}
      >
        <LoopoConfigurator />
      </div>
    </div>
  );
};

export default LoopoWithLoading;
