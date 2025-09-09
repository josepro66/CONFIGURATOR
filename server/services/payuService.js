const axios = require('axios');
const crypto = require('crypto');
const { PAYU_CONFIG, getProductConfig, validatePrice, generateOrderId } = require('../config/payment');
const { db } = require('../config/database');

class PayUService {
  constructor() {
    this.config = PAYU_CONFIG;
  }

  // Generar firma MD5 para PayU
  generateSignature(orderData) {
    const {
      merchantId,
      referenceCode,
      amount,
      currency
    } = orderData;

    const signatureString = `${this.config.apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}`;
    return crypto.createHash('md5').update(signatureString).digest('hex');
  }

  // Crear orden en PayU
  async createOrder(productType, currency, productConfig) {
    try {
      // Validar precio en el servidor
      const config = getProductConfig(productType, currency);
      validatePrice(productType, config.amount, currency);

      const orderId = generateOrderId(productType);
      
      const orderData = {
        merchantId: this.config.merchantId,
        accountId: this.config.accountId,
        referenceCode: orderId,
        description: `${config.name} - Configuración personalizada`,
        amount: config.amount,
        currency: currency,
        buyerEmail: 'customer@email.com',
        buyerFullName: 'Cliente Configurador',
        buyerPhone: '3001234567',
        buyerDocument: '123456789',
        buyerDocumentType: 'CC',
        shippingAddress: {
          street1: 'Calle 123',
          street2: 'Apto 456',
          city: 'Bogotá',
          state: 'Cundinamarca',
          country: 'CO',
          postalCode: '110111'
        },
        additionalValues: {
          TX_VALUE: {
            value: config.amount,
            currency: currency
          }
        },
        signature: this.generateSignature({
          merchantId: this.config.merchantId,
          referenceCode: orderId,
          amount: config.amount,
          currency: currency
        })
      };

      // Guardar orden en base de datos
      await this.saveOrder(orderId, productType, productConfig, config.amount, currency, 'payu');

      // Crear orden en PayU
      const response = await axios.post(
        `${this.config.baseUrl}/payments-api/4.0/service.cgi`,
        orderData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.data && response.data.code === 'SUCCESS') {
        return {
          success: true,
          orderId: orderId,
          paymentUrl: response.data.result.payUrl,
          transactionId: response.data.result.transactionId,
          status: 'pending'
        };
      } else {
        throw new Error(`Error en PayU: ${response.data.error || 'Error desconocido'}`);
      }

    } catch (error) {
      console.error('Error creando orden PayU:', error);
      throw new Error(`Error al crear orden PayU: ${error.message}`);
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

  // Procesar webhook de PayU
  async processWebhook(webhookData) {
    try {
      const {
        referenceCode,
        transactionId,
        status,
        signature
      } = webhookData;

      // Verificar firma del webhook
      const expectedSignature = this.generateSignature({
        merchantId: this.config.merchantId,
        referenceCode: referenceCode,
        amount: webhookData.amount,
        currency: webhookData.currency
      });

      if (signature !== expectedSignature) {
        throw new Error('Firma del webhook inválida');
      }

      // Guardar webhook en base de datos
      await this.saveWebhook(webhookData);

      // Actualizar estado de la orden
      await this.updateOrderStatus(referenceCode, status, transactionId);

      return {
        success: true,
        message: 'Webhook procesado correctamente'
      };

    } catch (error) {
      console.error('Error procesando webhook PayU:', error);
      throw error;
    }
  }

  // Guardar webhook en base de datos
  async saveWebhook(webhookData) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO webhooks (webhook_id, provider, event_type, payload)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        webhookData.transactionId,
        'payu',
        'payment_notification',
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
          this.saveTransaction(orderId, transactionId, 'payu', status);
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

module.exports = new PayUService();

