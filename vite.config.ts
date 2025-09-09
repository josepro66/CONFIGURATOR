import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/CONFIGURATOR/', // Ajustado al nuevo repo para GitHub Pages
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Optimización de chunks para mejor code splitting
    rollupOptions: {
      output: {
        // División manual de chunks para optimizar la carga
        manualChunks: {
          // Chunk principal de React
          vendor: ['react', 'react-dom'],
          // Chunk de Three.js y librerías 3D (componentes más pesados)
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          // Chunk de utilidades y librerías comunes
          utils: ['gsap', 'framer-motion', 'sweetalert2'],
          // Chunk de pagos y APIs
          payment: ['@paypal/react-paypal-js', 'crypto-js'],
          // Chunk de UI y componentes
          ui: ['html2canvas'],
        },
        // Configuración de nombres de archivos para mejor cache
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Optimización de minificación
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Elimina console.log en producción
        drop_debugger: true,
      },
    },
    // Configuración de source maps
    sourcemap: false, // Deshabilitado en producción para mejor rendimiento
  },
  // Optimización de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'gsap',
      'framer-motion',
    ],
  },
})
