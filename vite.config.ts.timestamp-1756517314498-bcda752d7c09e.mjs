// vite.config.ts
import { defineConfig } from "file:///C:/Users/LENOVO/Desktop/CONFIGURADOR/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/LENOVO/Desktop/CONFIGURADOR/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  base: "/CONFIGURADOR/",
  // Siempre así para que GitHub Pages encuentre los assets
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Optimización de chunks para mejor code splitting
    rollupOptions: {
      output: {
        // División manual de chunks para optimizar la carga
        manualChunks: {
          // Chunk principal de React
          vendor: ["react", "react-dom"],
          // Chunk de Three.js y librerías 3D (componentes más pesados)
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          // Chunk de utilidades y librerías comunes
          utils: ["gsap", "framer-motion", "sweetalert2"],
          // Chunk de pagos y APIs
          payment: ["@paypal/react-paypal-js", "crypto-js"],
          // Chunk de UI y componentes
          ui: ["html2canvas", "react-tsparticles"]
        },
        // Configuración de nombres de archivos para mejor cache
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split("/").pop() : "chunk";
          return `js/[name]-[hash].js`;
        },
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    },
    // Optimización de minificación
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        // Elimina console.log en producción
        drop_debugger: true
      }
    },
    // Configuración de source maps
    sourcemap: false
    // Deshabilitado en producción para mejor rendimiento
  },
  // Optimización de dependencias
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "gsap",
      "framer-motion"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxMRU5PVk9cXFxcRGVza3RvcFxcXFxDT05GSUdVUkFET1JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXExFTk9WT1xcXFxEZXNrdG9wXFxcXENPTkZJR1VSQURPUlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTEVOT1ZPL0Rlc2t0b3AvQ09ORklHVVJBRE9SL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGJhc2U6ICcvQ09ORklHVVJBRE9SLycsIC8vIFNpZW1wcmUgYXNcdTAwRUQgcGFyYSBxdWUgR2l0SHViIFBhZ2VzIGVuY3VlbnRyZSBsb3MgYXNzZXRzXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgc2VydmVyOiB7XG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjQwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgZW1wdHlPdXREaXI6IHRydWUsXG4gICAgLy8gT3B0aW1pemFjaVx1MDBGM24gZGUgY2h1bmtzIHBhcmEgbWVqb3IgY29kZSBzcGxpdHRpbmdcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgLy8gRGl2aXNpXHUwMEYzbiBtYW51YWwgZGUgY2h1bmtzIHBhcmEgb3B0aW1pemFyIGxhIGNhcmdhXG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIC8vIENodW5rIHByaW5jaXBhbCBkZSBSZWFjdFxuICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAvLyBDaHVuayBkZSBUaHJlZS5qcyB5IGxpYnJlclx1MDBFRGFzIDNEIChjb21wb25lbnRlcyBtXHUwMEUxcyBwZXNhZG9zKVxuICAgICAgICAgIHRocmVlOiBbJ3RocmVlJywgJ0ByZWFjdC10aHJlZS9maWJlcicsICdAcmVhY3QtdGhyZWUvZHJlaSddLFxuICAgICAgICAgIC8vIENodW5rIGRlIHV0aWxpZGFkZXMgeSBsaWJyZXJcdTAwRURhcyBjb211bmVzXG4gICAgICAgICAgdXRpbHM6IFsnZ3NhcCcsICdmcmFtZXItbW90aW9uJywgJ3N3ZWV0YWxlcnQyJ10sXG4gICAgICAgICAgLy8gQ2h1bmsgZGUgcGFnb3MgeSBBUElzXG4gICAgICAgICAgcGF5bWVudDogWydAcGF5cGFsL3JlYWN0LXBheXBhbC1qcycsICdjcnlwdG8tanMnXSxcbiAgICAgICAgICAvLyBDaHVuayBkZSBVSSB5IGNvbXBvbmVudGVzXG4gICAgICAgICAgdWk6IFsnaHRtbDJjYW52YXMnLCAncmVhY3QtdHNwYXJ0aWNsZXMnXSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gQ29uZmlndXJhY2lcdTAwRjNuIGRlIG5vbWJyZXMgZGUgYXJjaGl2b3MgcGFyYSBtZWpvciBjYWNoZVxuICAgICAgICBjaHVua0ZpbGVOYW1lczogKGNodW5rSW5mbykgPT4ge1xuICAgICAgICAgIGNvbnN0IGZhY2FkZU1vZHVsZUlkID0gY2h1bmtJbmZvLmZhY2FkZU1vZHVsZUlkID8gY2h1bmtJbmZvLmZhY2FkZU1vZHVsZUlkLnNwbGl0KCcvJykucG9wKCkgOiAnY2h1bmsnO1xuICAgICAgICAgIHJldHVybiBganMvW25hbWVdLVtoYXNoXS5qc2A7XG4gICAgICAgIH0sXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnanMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF0nLFxuICAgICAgfSxcbiAgICB9LFxuICAgIC8vIE9wdGltaXphY2lcdTAwRjNuIGRlIG1pbmlmaWNhY2lcdTAwRjNuXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsIC8vIEVsaW1pbmEgY29uc29sZS5sb2cgZW4gcHJvZHVjY2lcdTAwRjNuXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gICAgLy8gQ29uZmlndXJhY2lcdTAwRjNuIGRlIHNvdXJjZSBtYXBzXG4gICAgc291cmNlbWFwOiBmYWxzZSwgLy8gRGVzaGFiaWxpdGFkbyBlbiBwcm9kdWNjaVx1MDBGM24gcGFyYSBtZWpvciByZW5kaW1pZW50b1xuICB9LFxuICAvLyBPcHRpbWl6YWNpXHUwMEYzbiBkZSBkZXBlbmRlbmNpYXNcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1xuICAgICAgJ3JlYWN0JyxcbiAgICAgICdyZWFjdC1kb20nLFxuICAgICAgJ3RocmVlJyxcbiAgICAgICdAcmVhY3QtdGhyZWUvZmliZXInLFxuICAgICAgJ0ByZWFjdC10aHJlZS9kcmVpJyxcbiAgICAgICdnc2FwJyxcbiAgICAgICdmcmFtZXItbW90aW9uJyxcbiAgICBdLFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd1MsU0FBUyxvQkFBb0I7QUFDclUsT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQTtBQUFBLEVBQ04sU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFFBQVE7QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQTtBQUFBLElBRWIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBO0FBQUEsUUFFTixjQUFjO0FBQUE7QUFBQSxVQUVaLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQTtBQUFBLFVBRTdCLE9BQU8sQ0FBQyxTQUFTLHNCQUFzQixtQkFBbUI7QUFBQTtBQUFBLFVBRTFELE9BQU8sQ0FBQyxRQUFRLGlCQUFpQixhQUFhO0FBQUE7QUFBQSxVQUU5QyxTQUFTLENBQUMsMkJBQTJCLFdBQVc7QUFBQTtBQUFBLFVBRWhELElBQUksQ0FBQyxlQUFlLG1CQUFtQjtBQUFBLFFBQ3pDO0FBQUE7QUFBQSxRQUVBLGdCQUFnQixDQUFDLGNBQWM7QUFDN0IsZ0JBQU0saUJBQWlCLFVBQVUsaUJBQWlCLFVBQVUsZUFBZSxNQUFNLEdBQUcsRUFBRSxJQUFJLElBQUk7QUFDOUYsaUJBQU87QUFBQSxRQUNUO0FBQUEsUUFDQSxnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxNQUNsQjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1IsY0FBYztBQUFBO0FBQUEsUUFDZCxlQUFlO0FBQUEsTUFDakI7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUVBLFdBQVc7QUFBQTtBQUFBLEVBQ2I7QUFBQTtBQUFBLEVBRUEsY0FBYztBQUFBLElBQ1osU0FBUztBQUFBLE1BQ1A7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
