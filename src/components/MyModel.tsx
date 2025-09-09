import React from 'react';
import { useGLTF } from '@react-three/drei';

interface MyModelProps {
  onReady: () => void;
}

const MyModel: React.FC<MyModelProps> = ({ onReady }) => {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/BEATO3.glb`);

  // Call onReady when the model is available
  React.useEffect(() => {
    if (gltf) {
      console.log('Modelo BEATO3.glb cargado');
      onReady();
    }
  }, [gltf, onReady]);

  return <primitive object={gltf.scene} />;
};

export default MyModel;
