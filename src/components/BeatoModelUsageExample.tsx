import React from 'react';
import BeatoModelWithLoading from './BeatoModelWithLoading';

const BeatoModelUsageExample: React.FC = () => {
  const handleModelReady = () => {
    console.log('¡Modelo BEATO3.glb cargado completamente!');
    // Aquí puedes agregar cualquier lógica adicional
    // Por ejemplo: mostrar controles, habilitar interacciones, etc.
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <BeatoModelWithLoading 
        onModelReady={handleModelReady}
        style={{ width: '100%', height: '100%' }}
        minimumLoadingTime={4000} // 4 segundos mínimo de carga
      />
    </div>
  );
};

export default BeatoModelUsageExample;
