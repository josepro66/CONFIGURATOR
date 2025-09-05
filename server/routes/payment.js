const express = require('express');
const router = express.Router();
const payuService = require('../services/payuService');
const paypalService = require('../services/paypalService');
const {
  paymentRateLimiter,
  webhookRateLimiter,
  validateOrderInput,
  validateWebhookInput,
  handleValidationErrors,
  verifyWebhookSignature,
  securityLogger,
  sanitizeInput
} = require('../middleware/security');

// Ruta para crear orden PayU
router.post('/payu/create-order',
  paymentRateLimiter,
  securityLogger,
  sanitizeInput,
  validateOrderInput,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { productType, currency, productConfig } = req.body;

      const result = await payuService.createOrder(productType, currency, productConfig);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error en endpoint PayU create-order:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }
);

// Ruta para crear orden PayPal
router.post('/paypal/create-order',
  paymentRateLimiter,
  securityLogger,
  sanitizeInput,
  validateOrderInput,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { productType, currency, productConfig } = req.body;

      const result = await paypalService.createOrder(productType, currency, productConfig);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error en endpoint PayPal create-order:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }
);

// Ruta para capturar pago PayPal
router.post('/paypal/capture-payment',
  paymentRateLimiter,
  securityLogger,
  sanitizeInput,
  async (req, res) => {
    try {
      const { paypalOrderId } = req.body;

      if (!paypalOrderId) {
        return res.status(400).json({
          success: false,
          error: 'paypalOrderId es requerido'
        });
      }

      const result = await paypalService.capturePayment(paypalOrderId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error en endpoint PayPal capture-payment:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }
);

// Webhook para PayU
router.post('/webhook/payu',
  webhookRateLimiter,
  securityLogger,
  sanitizeInput,
  validateWebhookInput,
  handleValidationErrors,
  async (req, res) => {
    try {
      const webhookData = req.body;

      const result = await payuService.processWebhook(webhookData);

      res.json({
        success: true,
        message: 'Webhook procesado correctamente'
      });

    } catch (error) {
      console.error('Error procesando webhook PayU:', error);
      res.status(400).json({
        success: false,
        error: 'Error procesando webhook',
        message: error.message
      });
    }
  }
);

// Webhook para PayPal
router.post('/webhook/paypal',
  webhookRateLimiter,
  securityLogger,
  sanitizeInput,
  validateWebhookInput,
  handleValidationErrors,
  async (req, res) => {
    try {
      const webhookData = req.body;

      const result = await paypalService.processWebhook(webhookData);

      res.json({
        success: true,
        message: 'Webhook procesado correctamente'
      });

    } catch (error) {
      console.error('Error procesando webhook PayPal:', error);
      res.status(400).json({
        success: false,
        error: 'Error procesando webhook',
        message: error.message
      });
    }
  }
);

// Ruta para obtener estado de una orden
router.get('/order/:orderId/status',
  securityLogger,
  sanitizeInput,
  async (req, res) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'orderId es requerido'
        });
      }

      // Intentar obtener de ambos servicios
      let orderStatus = null;
      try {
        orderStatus = await payuService.getOrderStatus(orderId);
      } catch (error) {
        try {
          orderStatus = await paypalService.getOrderStatus(orderId);
        } catch (error2) {
          // Si no se encuentra en ninguno, devolver error
          return res.status(404).json({
            success: false,
            error: 'Orden no encontrada'
          });
        }
      }

      res.json({
        success: true,
        data: orderStatus
      });

    } catch (error) {
      console.error('Error obteniendo estado de orden:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }
);

// Ruta para obtener configuración de productos (solo precios públicos)
router.get('/products/config',
  securityLogger,
  async (req, res) => {
    try {
      const { getProductConfig } = require('../config/payment');
      
      const products = ['beato', 'beato16', 'knobo', 'mixo', 'loopo', 'fado'];
      const currencies = ['USD', 'EUR', 'COP'];
      
      const config = {};
      
      products.forEach(product => {
        config[product] = {};
        currencies.forEach(currency => {
          try {
            const productConfig = getProductConfig(product, currency);
            config[product][currency] = {
              name: productConfig.name,
              amount: productConfig.amount,
              symbol: productConfig.symbol
            };
          } catch (error) {
            // Moneda no soportada para este producto
          }
        });
      });

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('Error obteniendo configuración de productos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }
);

// Ruta de salud del servidor
router.get('/health',
  async (req, res) => {
    res.json({
      success: true,
      message: 'Servidor de pagos funcionando correctamente',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
);

module.exports = router;

