const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Rate limiting - máximo 10 intentos de pago por minuto por IP
const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: {
    error: 'Too many payment attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware CSRF
const csrfProtection = (req, res, next) => {
  const token = req.headers['x-csrf-token'];
  const sessionToken = req.session.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_INVALID'
    });
  }
  next();
};

// Configuración segura de precios (NUNCA exponer)
const SECURE_PRICING = {
  beato: { USD: 250.00, EUR: 230.00, COP: 950000 },
  beato16: { USD: 320.00, EUR: 295.00, COP: 1200000 },
  knobo: { USD: 180.00, EUR: 165.00, COP: 720000 },
  mixo: { USD: 280.00, EUR: 260.00, COP: 1100000 },
  loopo: { USD: 200.00, EUR: 185.00, COP: 800000 },
  fado: { USD: 220.00, EUR: 205.00, COP: 880000 }
};

// Configuración PayU segura (variables de entorno)
const PAYU_CONFIG = {
  API_KEY: process.env.PAYU_API_KEY,
  MERCHANT_ID: process.env.PAYU_MERCHANT_ID,
  ACCOUNT_ID: process.env.PAYU_ACCOUNT_ID,
  TEST_MODE: process.env.NODE_ENV !== 'production'
};

// Validadores de entrada
const productConfigValidation = [
  body('product').isIn(['beato', 'beato16', 'knobo', 'mixo', 'loopo', 'fado']),
  body('currency').isIn(['USD', 'EUR', 'COP']),
  body('colors').isObject(),
  body('customerInfo.email').isEmail().normalizeEmail(),
  body('customerInfo.fullName').isLength({ min: 2, max: 100 }).trim(),
  body('customerInfo.phone').optional().isMobilePhone(),
  body('customerInfo.country').isLength({ min: 2, max: 2 })
];

// Función para generar firma PayU segura
function generateSecurePayUSignature(apiKey, merchantId, referenceCode, amount, currency) {
  const signatureString = `${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}`;
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

// Función para validar configuración del producto
function validateProductConfiguration(product, colors) {
  const validColorSets = {
    beato: ['chasis', 'buttons', 'knobs'],
    beato16: ['chasis', 'buttons', 'knobs', 'teclas', 'faders'],
    knobo: ['chasis', 'knobs'],
    mixo: ['chasis', 'buttons', 'knobs', 'faders'],
    loopo: ['chasis', 'knobs'],
    fado: ['chasis', 'faders']
  };

  const requiredComponents = validColorSets[product];
  if (!requiredComponents) return false;

  return requiredComponents.every(component => 
    colors[component] && typeof colors[component] === 'string'
  );
}

// 🔒 ENDPOINT: Generar CSRF Token
router.get('/csrf-token', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  
  res.json({ csrfToken: token });
});

// 🔒 ENDPOINT: Crear orden PayU segura
router.post('/create-payu-order', 
  paymentRateLimit,
  csrfProtection,
  productConfigValidation,
  async (req, res) => {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input data',
          code: 'VALIDATION_ERROR',
          details: errors.array()
        });
      }

      const { product, currency, colors, customerInfo } = req.body;

      // Validar configuración del producto
      if (!validateProductConfiguration(product, colors)) {
        return res.status(400).json({
          error: 'Invalid product configuration',
          code: 'INVALID_CONFIG'
        });
      }

      // Calcular precio seguro (solo en backend)
      const amount = SECURE_PRICING[product][currency];
      if (!amount) {
        return res.status(400).json({
          error: 'Invalid product or currency',
          code: 'INVALID_PRICING'
        });
      }

      // Generar referencia única
      const referenceCode = `${product}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Generar firma segura
      const signature = generateSecurePayUSignature(
        PAYU_CONFIG.API_KEY,
        PAYU_CONFIG.MERCHANT_ID,
        referenceCode,
        amount,
        currency
      );

      // Crear orden en base de datos (log de seguridad)
      const orderData = {
        referenceCode,
        product,
        currency,
        amount,
        customerEmail: customerInfo.email,
        customerName: customerInfo.fullName,
        productConfig: colors,
        createdAt: new Date(),
        status: 'pending',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      // Aquí guardarías en tu base de datos
      console.log('🔒 Secure order created:', orderData);

      // Respuesta segura (sin exponer datos sensibles)
      res.json({
        success: true,
        paymentData: {
          merchantId: PAYU_CONFIG.MERCHANT_ID,
          accountId: PAYU_CONFIG.ACCOUNT_ID,
          referenceCode,
          amount: amount.toFixed(2),
          currency,
          signature,
          description: `${product.toUpperCase()} Custom Controller`,
          buyerEmail: customerInfo.email,
          buyerFullName: customerInfo.fullName,
          test: PAYU_CONFIG.TEST_MODE ? 1 : 0
        }
      });

    } catch (error) {
      console.error('🚨 Payment creation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// 🔒 ENDPOINT: Verificar pago PayU
router.post('/verify-payu-payment',
  paymentRateLimit,
  csrfProtection,
  [
    body('referenceCode').isAlphanumeric(),
    body('transactionId').isAlphanumeric(),
    body('signature').isHexadecimal()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid verification data',
          code: 'VALIDATION_ERROR'
        });
      }

      const { referenceCode, transactionId, signature } = req.body;

      // Verificar firma de confirmación
      const expectedSignature = crypto
        .createHash('md5')
        .update(`${PAYU_CONFIG.API_KEY}~${PAYU_CONFIG.MERCHANT_ID}~${referenceCode}~${transactionId}`)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.log('🚨 Invalid payment signature:', { referenceCode, transactionId });
        return res.status(400).json({
          error: 'Invalid payment signature',
          code: 'INVALID_SIGNATURE'
        });
      }

      // Actualizar estado del pedido
      console.log('✅ Payment verified:', { referenceCode, transactionId });

      res.json({
        success: true,
        message: 'Payment verified successfully'
      });

    } catch (error) {
      console.error('🚨 Payment verification error:', error);
      res.status(500).json({
        error: 'Verification failed',
        code: 'VERIFICATION_ERROR'
      });
    }
  }
);

// 🔒 ENDPOINT: Crear orden PayPal segura
router.post('/create-paypal-order',
  paymentRateLimit,
  csrfProtection,
  productConfigValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input data',
          code: 'VALIDATION_ERROR'
        });
      }

      const { product, currency, colors, customerInfo } = req.body;

      // Validar configuración
      if (!validateProductConfiguration(product, colors)) {
        return res.status(400).json({
          error: 'Invalid product configuration',
          code: 'INVALID_CONFIG'
        });
      }

      // Calcular precio seguro
      const amount = SECURE_PRICING[product][currency];

      // Crear orden PayPal usando su API
      const paypalOrder = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: `${product}_${Date.now()}`,
          amount: {
            currency_code: currency,
            value: amount.toFixed(2)
          },
          description: `${product.toUpperCase()} Custom MIDI Controller`
        }],
        application_context: {
          brand_name: 'CreArt Tech',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW'
        }
      };

      // Aquí harías la llamada a PayPal API
      res.json({
        success: true,
        orderData: paypalOrder
      });

    } catch (error) {
      console.error('🚨 PayPal order creation error:', error);
      res.status(500).json({
        error: 'Order creation failed',
        code: 'ORDER_ERROR'
      });
    }
  }
);

module.exports = router;
