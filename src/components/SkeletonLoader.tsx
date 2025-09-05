import React from 'react';

// Componente Skeleton reutilizable para fallbacks de lazy loading
// Mejora la UX mostrando una estructura similar al contenido real mientras carga
interface SkeletonLoaderProps {
  type?: 'configurator' | 'payment' | 'product' | 'default';
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'default', className = '' }) => {
  const baseClasses = 'animate-pulse bg-gray-700 rounded';
  
  switch (type) {
    case 'configurator':
      return (
        <div className={`w-full h-screen ${className}`}>
          {/* Skeleton para el canvas 3D */}
          <div className={`${baseClasses} w-full h-3/4 mb-4`} />
          {/* Skeleton para controles */}
          <div className="flex gap-4 mb-4">
            <div className={`${baseClasses} w-24 h-10`} />
            <div className={`${baseClasses} w-24 h-10`} />
            <div className={`${baseClasses} w-24 h-10`} />
          </div>
          {/* Skeleton para paleta de colores */}
          <div className="flex gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${baseClasses} w-12 h-12 rounded-full`} />
            ))}
          </div>
        </div>
      );
    
    case 'payment':
      return (
        <div className={`w-full max-w-md mx-auto p-6 ${className}`}>
          {/* Skeleton para formulario de pago */}
          <div className={`${baseClasses} w-full h-12 mb-4`} />
          <div className={`${baseClasses} w-full h-12 mb-4`} />
          <div className={`${baseClasses} w-full h-12 mb-4`} />
          <div className={`${baseClasses} w-32 h-12 mx-auto`} />
        </div>
      );
    
    case 'product':
      return (
        <div className={`w-full ${className}`}>
          {/* Skeleton para imagen del producto */}
          <div className={`${baseClasses} w-full h-64 mb-4`} />
          {/* Skeleton para información del producto */}
          <div className={`${baseClasses} w-3/4 h-6 mb-2`} />
          <div className={`${baseClasses} w-1/2 h-4 mb-4`} />
          <div className={`${baseClasses} w-24 h-10`} />
        </div>
      );
    
    default:
      return (
        <div className={`w-full h-32 ${className}`}>
          <div className={`${baseClasses} w-full h-full`} />
        </div>
      );
  }
};

export default SkeletonLoader;
