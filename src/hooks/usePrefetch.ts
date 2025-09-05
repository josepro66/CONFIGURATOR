import { useCallback } from 'react';

// Hook personalizado para prefetch de componentes lazy
// Permite cargar componentes en segundo plano cuando el usuario hace hover o entra en viewport
// Mejora la experiencia al reducir el tiempo de carga percibido
export const usePrefetch = () => {
  const prefetchComponent = useCallback((lazyComponent: () => Promise<any>) => {
    // Inicia la carga del componente en segundo plano
    // No bloquea la UI actual, solo prepara el componente para uso futuro
    lazyComponent().catch((error) => {
      console.warn('Prefetch failed:', error);
    });
  }, []);

  const prefetchOnHover = useCallback((
    lazyComponent: () => Promise<any>,
    event: React.MouseEvent
  ) => {
    // Prefetch cuando el usuario hace hover sobre un elemento
    // Útil para botones que cargan componentes pesados
    prefetchComponent(lazyComponent);
  }, [prefetchComponent]);

  const prefetchOnIntersection = useCallback((
    lazyComponent: () => Promise<any>,
    element: HTMLElement | null
  ) => {
    // Prefetch cuando un elemento entra en el viewport
    // Usa Intersection Observer para detectar cuando el elemento es visible
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            prefetchComponent(lazyComponent);
            observer.disconnect(); // Solo prefetch una vez
          }
        });
      },
      { threshold: 0.1 } // Prefetch cuando 10% del elemento es visible
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [prefetchComponent]);

  return {
    prefetchComponent,
    prefetchOnHover,
    prefetchOnIntersection
  };
};
