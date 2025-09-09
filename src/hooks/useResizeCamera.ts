import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface UseResizeCameraProps {
  aspectRatio?: number;
  fov?: number;
  near?: number;
  far?: number;
}

export const useResizeCamera = ({
  aspectRatio,
  fov = 75,
  near = 0.1,
  far = 1000
}: UseResizeCameraProps = {}) => {
  const { camera, gl, size } = useThree();
  const cameraRef = useRef<THREE.Camera>();

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const handleResize = () => {
      if (!cameraRef.current) return;

      const currentCamera = cameraRef.current as THREE.PerspectiveCamera;
      
      // Calcular aspect ratio basado en el tamaño actual
      const currentAspect = size.width / size.height;
      const targetAspect = aspectRatio || currentAspect;

      // Actualizar la cámara
      currentCamera.aspect = targetAspect;
      currentCamera.fov = fov;
      currentCamera.near = near;
      currentCamera.far = far;
      currentCamera.updateProjectionMatrix();

      // Actualizar el renderer
      gl.setSize(size.width, size.height);
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    // Ejecutar inmediatamente
    handleResize();

    // Agregar event listener
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [size.width, size.height, aspectRatio, fov, near, far, gl]);

  return cameraRef.current;
};
