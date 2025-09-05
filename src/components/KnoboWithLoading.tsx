import React, { useState, useEffect } from 'react';
import KnoboLoadingScreen from './KnoboLoadingScreen';
import KnoboConfigurator from '../KnoboConfigurator';

interface KnoboWithLoadingProps {
  className?: string;
  style?: React.CSSProperties;
}

const KnoboWithLoading: React.FC<KnoboWithLoadingProps> = ({
  className = '',
  style = {}
}) => {
  const [ready, setReady] = useState(false);
  const [startTime] = useState(Date.now());

  // Forzar exactamente 4.1 segundos de loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Tiempo mínimo de 4.1 segundos completado para KNOBO');
      setReady(true);
    }, 4100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={className} style={style}>
      <KnoboLoadingScreen isVisible={!ready} />

      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: ready ? 1 : 0
        }}
      >
        <KnoboConfigurator />
      </div>
    </div>
  );
};

export default KnoboWithLoading;
