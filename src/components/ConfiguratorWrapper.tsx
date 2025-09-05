import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

interface ConfiguratorWrapperProps {
  children: React.ReactNode;
}

const ConfiguratorWrapper: React.FC<ConfiguratorWrapperProps> = ({ children }) => {
  return (
    <Suspense fallback={null}>
      {children}
    </Suspense>
  );
};

export default ConfiguratorWrapper;

