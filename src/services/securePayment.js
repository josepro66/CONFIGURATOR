// 🔒 SISTEMA DE PAGOS SEGURO - FRONTEND
// Este archivo reemplaza todas las funciones de pago inseguras

class SecurePaymentService {
  constructor() {
    this.csrfToken = null;
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://tu-backend-seguro.com/api'
      : 'http://localhost:3001/api';
  }

  // 🔒 Obtener token CSRF
  async getCSRFToken() {
    try {
      const response = await fetch(`${this.baseURL}/payment/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get CSRF token');
      }

      const data = await response.json();
      this.csrfToken = data.csrfToken;
      return this.csrfToken;
    } catch (error) {
      console.error('🚨 CSRF token error:', error);
      throw new Error('Security token unavailable');
    }
  }

  // 🔒 Validar configuración del producto (client-side)
  validateProductConfig(product, colors, customerInfo) {
    const validProducts = ['beato', 'beato16', 'knobo', 'mixo', 'loopo', 'fado'];
    const validCurrencies = ['USD', 'EUR', 'COP'];

    // Validar producto
    if (!validProducts.includes(product)) {
      return { valid: false, error: 'Invalid product selection' };
    }

    // Validar información del cliente
    if (!customerInfo.email || !customerInfo.fullName) {
      return { valid: false, error: 'Customer information is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Validar colores según producto
    const requiredComponents = {
      beato: ['chasis', 'buttons', 'knobs'],
      beato16: ['chasis', 'buttons', 'knobs', 'teclas', 'faders'],
      knobo: ['chasis', 'knobs'],
      mixo: ['chasis', 'buttons', 'knobs', 'faders'],
      loopo: ['chasis', 'knobs'],
      fado: ['chasis', 'faders']
    };

    const required = requiredComponents[product];
    for (const component of required) {
      if (!colors[component]) {
        return { 
          valid: false, 
          error: `Please select a color for ${component}` 
        };
      }
    }

    return { valid: true };
  }

  // 🔒 Función segura para crear orden PayU
  async createSecurePayUOrder(productConfig, customerInfo, currency = 'USD') {
    try {
      // Validación client-side
      const validation = this.validateProductConfig(
        productConfig.product, 
        productConfig.colors, 
        customerInfo
      );

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Asegurar token CSRF
      if (!this.csrfToken) {
        await this.getCSRFToken();
      }

      // Enviar solo configuración al backend (NO precios, NO firmas)
      const payload = {
        product: productConfig.product,
        currency,
        colors: productConfig.colors,
        customerInfo: {
          email: customerInfo.email.toLowerCase().trim(),
          fullName: customerInfo.fullName.trim(),
          phone: customerInfo.phone?.trim(),
          country: customerInfo.country || 'CO'
        }
      };

      const response = await fetch(`${this.baseURL}/payment/create-payu-order`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment creation failed');
      }

      if (!data.success) {
        throw new Error('Invalid server response');
      }

      // Retornar datos seguros para el formulario PayU
      return {
        success: true,
        paymentData: data.paymentData,
        message: 'Order created successfully'
      };

    } catch (error) {
      console.error('🚨 Secure PayU order error:', error);
      
      // Manejar errores sin exponer información sensible
      const userFriendlyErrors = {
        'Invalid product selection': 'Please select a valid product',
        'Customer information is required': 'Please fill in all required fields',
        'Invalid email format': 'Please enter a valid email address',
        'Too many payment attempts': 'Too many attempts. Please wait a minute.',
        'Invalid CSRF token': 'Session expired. Please refresh the page.'
      };

      const userMessage = userFriendlyErrors[error.message] || 'Payment processing unavailable. Please try again.';
      
      return {
        success: false,
        error: userMessage,
        code: error.code || 'PAYMENT_ERROR'
      };
    }
  }

  // 🔒 Función segura para crear orden PayPal
  async createSecurePayPalOrder(productConfig, customerInfo, currency = 'USD') {
    try {
      const validation = this.validateProductConfig(
        productConfig.product, 
        productConfig.colors, 
        customerInfo
      );

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (!this.csrfToken) {
        await this.getCSRFToken();
      }

      const payload = {
        product: productConfig.product,
        currency,
        colors: productConfig.colors,
        customerInfo
      };

      const response = await fetch(`${this.baseURL}/payment/create-paypal-order`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'PayPal order creation failed');
      }

      return {
        success: true,
        orderData: data.orderData
      };

    } catch (error) {
      console.error('🚨 Secure PayPal order error:', error);
      return {
        success: false,
        error: 'PayPal payment unavailable. Please try again.'
      };
    }
  }

  // 🔒 Verificar pago PayU de forma segura
  async verifyPayUPayment(referenceCode, transactionId, signature) {
    try {
      if (!this.csrfToken) {
        await this.getCSRFToken();
      }

      const response = await fetch(`${this.baseURL}/payment/verify-payu-payment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify({
          referenceCode,
          transactionId,
          signature
        })
      });

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('🚨 Payment verification error:', error);
      return {
        success: false,
        error: 'Payment verification failed'
      };
    }
  }

  // 🔒 Limpiar datos sensibles del localStorage
  clearSensitiveData() {
    const keysToRemove = [
      'payuSignature',
      'paymentAmount',
      'apiKey',
      'merchantId',
      'accountId'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  // 🔒 Sanitizar datos de entrada
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>\"']/g, '') // Remover caracteres peligrosos
      .substring(0, 1000); // Limitar longitud
  }
}

// 🔒 Instancia singleton del servicio seguro
const securePaymentService = new SecurePaymentService();

// 🔒 FUNCIONES SEGURAS PARA USAR EN LOS CONFIGURADORES

// ✅ Reemplaza todas las funciones inseguras de PayU
export const handleSecurePayUCheckout = async (productConfig, customerInfo, currency = 'USD') => {
  try {
    // Limpiar datos sensibles existentes
    securePaymentService.clearSensitiveData();

    // Crear orden segura
    const result = await securePaymentService.createSecurePayUOrder(
      productConfig, 
      customerInfo, 
      currency
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    // Crear formulario PayU con datos seguros del backend
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/'; // sandbox
    form.style.display = 'none';

    // Agregar campos seguros
    const fields = result.paymentData;
    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

    return { success: true };

  } catch (error) {
    console.error('🚨 Secure PayU checkout error:', error);
    return {
      success: false,
      error: error.message || 'Payment processing failed'
    };
  }
};

// ✅ Reemplaza las funciones inseguras de PayPal
export const handleSecurePayPalCheckout = async (productConfig, customerInfo, currency = 'USD') => {
  try {
    securePaymentService.clearSensitiveData();

    const result = await securePaymentService.createSecurePayPalOrder(
      productConfig,
      customerInfo,
      currency
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.orderData;

  } catch (error) {
    console.error('🚨 Secure PayPal checkout error:', error);
    return {
      success: false,
      error: error.message || 'PayPal processing failed'
    };
  }
};

// ✅ Función segura para obtener precio (solo para mostrar, no para cálculos)
export const getDisplayPrice = (product, currency = 'USD') => {
  // Precios solo para mostrar (NO usar para cálculos de pago)
  const displayPrices = {
    beato: { USD: 250, EUR: 230, COP: 950000 },
    beato16: { USD: 320, EUR: 295, COP: 1200000 },
    knobo: { USD: 180, EUR: 165, COP: 720000 },
    mixo: { USD: 280, EUR: 260, COP: 1100000 },
    loopo: { USD: 200, EUR: 185, COP: 800000 },
    fado: { USD: 220, EUR: 205, COP: 880000 }
  };

  return displayPrices[product]?.[currency] || 0;
};

export default securePaymentService;
