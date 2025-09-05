import React from 'react';

// Imports lazy para componentes pesados
// React.lazy permite cargar componentes solo cuando son necesarios
// Esto reduce el bundle inicial y mejora el tiempo de carga de la aplicación

// 3D Configurators - Heavier components due to Three.js
export const BeatoConfigurator = React.lazy(() => 
  import('../BeatoConfigurator').then(module => ({
    default: module.default
  }))
);

export const Beato16Configurator = React.lazy(() => 
  import('../Beato16Configurator').then(module => ({
    default: module.default
  }))
);

export const KnoboConfigurator = React.lazy(() => 
  import('../KnoboConfigurator').then(module => ({
    default: module.default
  }))
);

export const MixoConfigurator = React.lazy(() => 
  import('../MixoConfigurator').then(module => ({
    default: module.default
  }))
);

export const LoopoConfigurator = React.lazy(() => 
  import('../LoopoConfigurator').then(module => ({
    default: module.default
  }))
);

export const FadoConfigurator = React.lazy(() => 
  import('../FadoConfigurator').then(module => ({
    default: module.default
  }))
);

// Componente de pago finalizado
export const PagoFinalizado = React.lazy(() => 
  import('../PagoFinalizado').then(module => ({
    default: module.default
  }))
);

// Configurator wrapper
export const ConfiguratorWrapper = React.lazy(() => 
  import('../components/ConfiguratorWrapper').then(module => ({
    default: module.default
  }))
);
