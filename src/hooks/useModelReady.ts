import { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';

export const useModelReady = () => {
  const { progress, total, loaded } = useProgress();
  const [isLoading, setIsLoading] = useState(true);
  const [modelFullyLoaded, setModelFullyLoaded] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Si no hay nada que cargar, mostrar inmediatamente
    if (total === 0) {
      setIsLoading(false);
      return;
    }

    // Si todo está cargado al 100%, marcar como cargado
    if (progress >= 100 && loaded >= total) {
      setModelFullyLoaded(true);
    }
  }, [progress, total, loaded]);

  useEffect(() => {
    if (modelFullyLoaded) {
      // Calcular el tiempo transcurrido desde el inicio
      const elapsedTime = Date.now() - startTime;
      const minimumLoadingTime = 5000; // 5 segundos mínimo
      const remainingTime = Math.max(0, minimumLoadingTime - elapsedTime);

      // Esperar el tiempo restante para completar los 5 segundos
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, remainingTime);
      
      return () => clearTimeout(timer);
    }
  }, [modelFullyLoaded, startTime]);

  return { isLoading, progress, total, loaded };
};

