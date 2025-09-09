import { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';

export const useModelVisibility = () => {
  const { progress, total, loaded } = useProgress();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Si no hay nada que cargar, mostrar inmediatamente
    if (total === 0) {
      setIsLoading(false);
      return;
    }

    // Si todo está cargado al 100%, esperar a que el modelo esté visible
    if (progress >= 100 && loaded >= total) {
      // Delay más largo para asegurar que el modelo 3D esté completamente renderizado y visible
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000); // 2 segundos para que el modelo aparezca completamente
      
      return () => clearTimeout(timer);
    }
  }, [progress, total, loaded]);

  return { isLoading, progress, total, loaded };
};
