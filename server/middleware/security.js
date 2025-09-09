const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

// Rate limiting para prevenir ataques de fuerza bruta
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || 15 * 60 * 1000, // 15 minutos por defecto
    max: max || 100, // máximo 100 requests por ventana
    message: {
      error: message || 'Demasiadas solicitudes, inténtalo de nuevo más tarde'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limiter específico para pagos
const paymentRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutos
  10, // máximo 10 intentos de pago por 15 minutos
  'Demasiados intentos de pago, inténtalo de nuevo más tarde'
);

// Rate limiter para webhooks
const webhookRateLimiter = createRateLimiter(
  60 * 1000, // 1 minuto
  50, // máximo 50 webhooks por minuto
  'Demasiados webhooks recibidos'
);

// Validación de entrada para órdenes
const validateOrderInput = [
  body('productType')
    .isIn(['beato', 'beato16', 'knobo', 'mixo', 'loopo', 'fado'])
    .withMessage('Tipo de producto inválido'),
  
  body('currency')
    .isIn(['USD', 'EUR', 'COP'])
    .withMessage('Moneda no soportada'),
  
  body('productConfig')
    .isObject()
    .withMessage('Configuración de producto debe ser un objeto'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Monto debe ser un número válido mayor a 0'),
];

// Validación de entrada para webhooks
const validateWebhookInput = [
  body()
    .isObject()
    .withMessage('Payload del webhook debe ser un objeto válido'),
];

// Middleware para verificar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      details: errors.array()
    });
  }
  next();
};

// Middleware para verificar autenticación (opcional para webhooks)
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-paypal-signature'] || req.headers['x-payu-signature'];
  
  if (!signature) {
    return res.status(401).json({
      error: 'Firma de webhook requerida'
    });
  }

  // Aquí puedes agregar lógica adicional para verificar la firma
  // Por ahora solo verificamos que exista
  next();
};

// Middleware para logging de seguridad
const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent');

  console.log(`[${timestamp}] ${ip} ${method} ${url} - ${userAgent}`);

  // Log de intentos de pago
  if (url.includes('/payu/create-order') || url.includes('/paypal/create-order')) {
    console.log(`[PAYMENT ATTEMPT] ${ip} - Product: ${req.body.productType} - Amount: ${req.body.amount} ${req.body.currency}`);
  }

  next();
};

// Middleware para CORS seguro
const secureCors = (req, res, next) => {
  const allowedOrigins = [
    process.env.CORS_ORIGIN,
    'http://localhost:3000',
    'https://www.crearttech.com'
  ].filter(Boolean);

  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', true);

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

// Middleware para sanitizar entrada
const sanitizeInput = (req, res, next) => {
  // Sanitizar strings
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/[<>]/g, '') // Remover < y >
      .trim();
  };

  // Sanitizar objeto recursivamente
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitizar body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitizar query params
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Configuración de Helmet para seguridad de headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://www.paypal.com", "https://www.sandbox.paypal.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.paypal.com", "https://api.sandbox.paypal.com", "https://sandbox.api.payulatam.com"],
      frameSrc: ["'self'", "https://www.paypal.com", "https://www.sandbox.paypal.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

module.exports = {
  createRateLimiter,
  paymentRateLimiter,
  webhookRateLimiter,
  validateOrderInput,
  validateWebhookInput,
  handleValidationErrors,
  verifyWebhookSignature,
  securityLogger,
  secureCors,
  sanitizeInput,
  helmetConfig
};

