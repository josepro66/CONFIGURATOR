require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

// Importar configuración y servicios
const { initDatabase } = require('./config/database');
const { 
  createRateLimiter, 
  helmetConfig, 
  secureCors, 
  sanitizeInput,
  securityLogger 
} = require('./middleware/security');
const paymentRoutes = require('./routes/payment');
const securePaymentRoutes = require('./routes/secure-payment');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de seguridad básica
app.use(helmetConfig);

// Configuración de CORS seguro
app.use(secureCors);

// Compresión para mejorar rendimiento
app.use(compression());

// Parsers para JSON y URL encoded
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de sesión para CSRF
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware de seguridad global
app.use(securityLogger);
app.use(sanitizeInput);

// Rate limiting global
const globalRateLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
);
app.use(globalRateLimiter);

// Rutas de la API
app.use('/api/payment', paymentRoutes);
app.use('/api/secure-payment', securePaymentRoutes);

// Ruta de salud general
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Ruta para verificar configuración (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/config/check', (req, res) => {
    const config = {
      payu: {
        hasApiKey: !!process.env.PAYU_API_KEY,
        hasMerchantId: !!process.env.PAYU_MERCHANT_ID,
        hasAccountId: !!process.env.PAYU_ACCOUNT_ID,
        hasSignatureKey: !!process.env.PAYU_SIGNATURE_KEY,
        baseUrl: process.env.PAYU_BASE_URL
      },
      paypal: {
        hasClientId: !!process.env.PAYPAL_CLIENT_ID,
        hasClientSecret: !!process.env.PAYPAL_CLIENT_SECRET,
        mode: process.env.PAYPAL_MODE
      },
      database: {
        type: 'sqlite',
        path: path.join(__dirname, 'data/orders.db')
      }
    };

    res.json({
      success: true,
      data: config
    });
  });
}

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

// Middleware para manejar errores globales
app.use((error, req, res, next) => {
  console.error('Error global:', error);

  // Si es un error de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: error.message
    });
  }

  // Si es un error de rate limiting
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes',
      message: 'Has excedido el límite de solicitudes. Inténtalo de nuevo más tarde.'
    });
  }

  // Error interno del servidor
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
  });
});

// Función para inicializar el servidor
const initializeServer = async () => {
  try {
    // Inicializar base de datos
    await initDatabase();
    console.log('✅ Base de datos inicializada');

    // Verificar variables de entorno críticas
    const requiredEnvVars = [
      'PAYU_API_KEY',
      'PAYU_MERCHANT_ID',
      'PAYU_ACCOUNT_ID',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn('⚠️  Variables de entorno faltantes:', missingVars);
      console.warn('   El servidor funcionará pero algunos servicios pueden no estar disponibles');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
      console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Modo: ${process.env.NODE_ENV === 'production' ? 'Producción' : 'Desarrollo'}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`💳 Endpoints de pago disponibles:`);
      console.log(`   POST /api/payment/payu/create-order`);
      console.log(`   POST /api/payment/paypal/create-order`);
      console.log(`   POST /api/payment/webhook/payu`);
      console.log(`   POST /api/payment/webhook/paypal`);
      console.log(`   GET  /api/payment/order/:orderId/status`);
      console.log(`   GET  /api/payment/products/config`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    console.error('❌ Error inicializando servidor:', error);
    process.exit(1);
  }
};

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// Inicializar servidor
initializeServer();

module.exports = app;

