import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Beato16LoadingScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const Beato16LoadingScreen: React.FC<Beato16LoadingScreenProps> = ({ isVisible, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Progreso optimizado para fluidez
  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / 4100) * 100, 100);
        
        // Solo actualizar si hay un cambio significativo
        setProgress(prevProgress => {
          if (Math.abs(prevProgress - newProgress) >= 1 || newProgress >= 100) {
            return newProgress;
          }
          return prevProgress;
        });
        
        if (newProgress >= 100) {
          clearInterval(interval);
          // Limpiar el video antes de completar
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
          onComplete?.();
        }
      }, 100); // Reducir la frecuencia de actualización

      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isVisible, startTime]);

  // Control del video optimizado para fluidez
  useEffect(() => {
    if (videoRef.current && isVisible) {
      const video = videoRef.current;
      
      // Configurar el video para mejor rendimiento
      video.playbackRate = 1.0;
      video.volume = 0;
      
      // Event listeners optimizados
      const handleCanPlay = () => {
        console.log('🎬 Video puede reproducirse');
        setVideoLoaded(true);
        // Reproducir inmediatamente cuando esté listo
        video.play().catch(error => {
          console.error('❌ Error reproduciendo video:', error);
          setVideoError(true);
        });
      };

      const handleError = (e: Event) => {
        console.error('❌ Error cargando video:', e);
        setVideoError(true);
      };

      const handleLoadStart = () => {
        console.log('🔄 Iniciando carga del video...');
      };

      const handleLoadedData = () => {
        console.log('✅ Video cargado completamente');
      };

      const handleWaiting = () => {
        console.log('⏳ Video esperando datos...');
      };

      const handlePlaying = () => {
        console.log('▶️ Video reproduciéndose');
      };

      // Agregar event listeners
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);

      // Intentar cargar el video
      video.load();

      // Cleanup
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
      };
    } else if (videoRef.current && !isVisible) {
      // Pausar y limpiar el video cuando se oculta
      const video = videoRef.current;
      video.pause();
      video.currentTime = 0;
      setVideoLoaded(false);
      setVideoError(false);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            overflow: 'hidden'
          }}
        >
          {/* Video de fondo */}
          <video
            ref={videoRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: -2
            }}
            muted
            loop
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            autoPlay
          >
<<<<<<< HEAD
            <source src={`${import.meta.env.BASE_URL}videos/video.mp4`} type="video/mp4" />
            {/* Fallback a imagen si el video no carga */}
            <img 
              src={`${import.meta.env.BASE_URL}textures/carga.jpg`} 
=======
            <source src="/CONFIGURADOR/videos/video.mp4" type="video/mp4" />
            {/* Fallback a imagen si el video no carga */}
            <img 
              src="/textures/carga.jpg" 
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
              alt="Loading background" 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </video>



          {/* Overlay para mejorar legibilidad */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: -1
            }}
          />

          {/* Logo BEATO16 */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#00FFFF',
              textShadow: '0 0 20px #00FFFF, 0 0 40px #00FFFF, 0 0 60px #00FFFF',
              position: 'relative',
              zIndex: 1
            }}
          >
            BEATO16
          </motion.div>

          {/* Subtítulo */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '40px',
              color: '#FFFFFF',
              textShadow: '0 0 15px #FFFFFF, 0 0 30px #FFFFFF',
              position: 'relative',
              zIndex: 1
            }}
          >
            Features: Metal body, 16 ARCADE buttons, and 4 assignable knobs.
          </motion.div>

          {/* Spinner animado */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{
              width: '100px',
              height: '100px',
              border: '6px solid rgba(0, 255, 255, 0.3)',
              borderTop: '6px solid #00FFFF',
              borderRadius: '50%',
              marginBottom: '40px',
              boxShadow: '0 0 30px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.4)',
              position: 'relative',
              zIndex: 1
            }}
          />
          
          {/* Texto de carga específico */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '20px',
              color: '#00FFFF',
              textShadow: '0 0 15px #00FFFF, 0 0 30px #00FFFF',
              position: 'relative',
              zIndex: 1
            }}
          >
            Cargando BEATO16... {Math.round(progress)}%
          </motion.div>

          {/* Mensaje cuando está al 100% */}
          {progress >= 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              style={{
                fontSize: '18px',
                color: '#00FF80',
                fontWeight: 'bold',
                marginBottom: '30px',
                textShadow: '0 0 15px #00FF80, 0 0 30px #00FF80',
                position: 'relative',
                zIndex: 1
              }}
            >
              ¡BEATO16 listo para configurar!
            </motion.div>
          )}
          
          {/* Barra de progreso mejorada */}
          <motion.div
            style={{
              width: '400px',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
              marginBottom: '40px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #00FFFF, #00CCFF, #00FFFF)',
                borderRadius: '4px',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.4)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite'
              }}
            />
          </motion.div>

          {/* Puntos animados */}
          <motion.div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '20px',
              position: 'relative',
              zIndex: 1
            }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#00FFFF',
                  borderRadius: '50%',
                  boxShadow: '0 0 15px rgba(0, 255, 255, 0.8), 0 0 30px rgba(0, 255, 255, 0.4)'
                }}
              />
            ))}
          </motion.div>

          {/* Estilos CSS para el efecto shimmer */}
          <style>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Beato16LoadingScreen;
