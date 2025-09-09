const axios = require('axios');
const { PAYPAL_CONFIG, getProductConfig, validatePrice, generateOrderId } = require('../config/payment');
const { db } = require('../config/database');

class PayPalService {
  constructor() {
    this.config = PAYPAL_CONFIG;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Obtener token de acceso de PayPal
  async getAccessToken() {
    try {
      // Verificar si ya tenemos un token válido
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.config.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error obteniendo token de PayPal:', error);
      throw new Error('Error de autenticación con PayPal');
    }
  }

  // Crear orden en PayPal
  async createOrder(productType, currency, productConfig) {
    try {
      // Validar precio en el servidor
      const config = getProductConfig(productType, currency);
      validatePrice(productType, config.amount, currency);

      const orderId = generateOrderId(productType);
      const accessToken = await this.getAccessToken();

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderId,
            description: `${config.name} - Configuración personalizada`,
            amount: {
              currency_code: currency,
              value: config.amount
            },
            custom_id: orderId
          }
        ],
        application_context: {
          return_url: `${process.env.CORS_ORIGIN}/payment/success`,
          cancel_url: `${process.env.CORS_ORIGIN}/payment/cancel`,
          brand_name: 'CreartTech MIDI Controllers',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING'
        }
      };

      // Guardar orden en base de datos
      await this.saveOrder(orderId, productType, productConfig, config.amount, currency, 'paypal');

      // Crear orden en PayPal
      const response = await axios.post(
        `${this.config.baseUrl}/v2/checkout/orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      if (response.data && response.data.id) {
        return {
          success: true,
          orderId: orderId,
          paypalOrderId: response.data.id,
          approvalUrl: response.data.links.find(link => link.rel === 'approve').href,
          status: 'pending'
        };
      } else {
        throw new Error('Error al crear orden en PayPal');
      }

    } catch (error) {
      console.error('Error creando orden PayPal:', error);
      throw new Error(`Error al crear orden PayPal: ${error.message}`);
    }
  }

  // Capturar pago de PayPal
  async capturePayment(paypalOrderId) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.config.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      if (response.data && response.data.status === 'COMPLETED') {
        // Actualizar estado de la orden
        const orderId = response.data.purchase_units[0].reference_id;
        await this.updateOrderStatus(orderId, 'completed', paypalOrderId);

        return {
          success: true,
          orderId: orderId,
          transactionId: response.data.purchase_units[0].payments.captures[0].id,
          status: 'completed'
        };
      } else {
        throw new Error('Error al capturar pago en PayPal');
      }

    } catch (error) {
      console.error('Error capturando pago PayPal:', error);
      throw new Error(`Error al capturar pago PayPal: ${error.message}`);
    }
  }

  // Guardar orden en base de datos
  async saveOrder(orderId, productType, productConfig, amount, currency, paymentMethod) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO orders (order_id, product_type, product_config, amount, currency, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        orderId,
        productType,
        JSON.stringify(productConfig),
        amount,
        currency,
        paymentMethod,
        'pending',
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  // Actualizar estado de la orden
  async updateOrderStatus(orderId, status, transactionId) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `);

      stmt.run(status, orderId, function(err) {
        if (err) {
          reject(err);
        } else {
          // Guardar transacción
          this.saveTransaction(orderId, transactionId, 'paypal', status);
          resolve();
        }
      });

      stmt.finalize();
    });
  }

  // Guardar transacción
  async saveTransaction(orderId, transactionId, provider, status) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO transactions (order_id, transaction_id, payment_provider, amount, currency, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        orderId,
        transactionId,
        provider,
        0, // Se actualizará con el monto real
        'USD', // Se actualizará con la moneda real
        status,
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  // Procesar webhook de PayPal
  async processWebhook(webhookData) {
    try {
      const {
        id: webhookId,
        event_type,
        resource
      } = webhookData;

      // Guardar webhook en base de datos
      await this.saveWebhook(webhookId, event_type, webhookData);

      // Procesar según el tipo de evento
      if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const orderId = resource.custom_id;
        const transactionId = resource.id;
        await this.updateOrderStatus(orderId, 'completed', transactionId);
      } else if (event_type === 'PAYMENT.CAPTURE.DENIED') {
        const orderId = resource.custom_id;
        const transactionId = resource.id;
        await this.updateOrderStatus(orderId, 'denied', transactionId);
      }

      return {
        success: true,
        message: 'Webhook procesado correctamente'
      };

    } catch (error) {
      console.error('Error procesando webhook PayPal:', error);
      throw error;
    }
  }

  // Guardar webhook en base de datos
  async saveWebhook(webhookId, eventType, webhookData) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO webhooks (webhook_id, provider, event_type, payload)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        webhookId,
        'paypal',
        eventType,
        JSON.stringify(webhookData),
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  // Obtener estado de una orden
  async getOrderStatus(orderId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM orders WHERE order_id = ?',
        [orderId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }
}

module.exports = new PayPalService();

