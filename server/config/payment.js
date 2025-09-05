require('dotenv').config();

// Configuración de productos y precios
const PRODUCTS = {
  beato: {
    name: 'Beato MIDI Controller',
    basePrice: parseFloat(process.env.BEATO_PRICE) || 200.00,
    currencies: {
      USD: { symbol: '$', amount: '200.00' },
      EUR: { symbol: '€', amount: '180.00' },
      COP: { symbol: '$', amount: '800000.00' }
    }
  },
  beato16: {
    name: 'Beato16 MIDI Controller',
    basePrice: parseFloat(process.env.BEATO16_PRICE) || 250.00,
    currencies: {
      USD: { symbol: '$', amount: '250.00' },
      EUR: { symbol: '€', amount: '225.00' },
      COP: { symbol: '$', amount: '1000000.00' }
    }
  },
  knobo: {
    name: 'Knobo MIDI Controller',
    basePrice: parseFloat(process.env.KNOBO_PRICE) || 150.00,
    currencies: {
      USD: { symbol: '$', amount: '150.00' },
      EUR: { symbol: '€', amount: '135.00' },
      COP: { symbol: '$', amount: '600000.00' }
    }
  },
  mixo: {
    name: 'Mixo MIDI Controller',
    basePrice: parseFloat(process.env.MIXO_PRICE) || 200.00,
    currencies: {
      USD: { symbol: '$', amount: '200.00' },
      EUR: { symbol: '€', amount: '180.00' },
      COP: { symbol: '$', amount: '800000.00' }
    }
  },
  loopo: {
    name: 'Loopo MIDI Controller',
    basePrice: parseFloat(process.env.LOOPO_PRICE) || 110.00,
    currencies: {
      USD: { symbol: '$', amount: '110.00' },
      EUR: { symbol: '€', amount: '99.00' },
      COP: { symbol: '$', amount: '440000.00' }
    }
  },
  fado: {
    name: 'Fado MIDI Controller',
    basePrice: parseFloat(process.env.FADO_PRICE) || 150.00,
    currencies: {
      USD: { symbol: '$', amount: '150.00' },
      EUR: { symbol: '€', amount: '135.00' },
      COP: { symbol: '$', amount: '600000.00' }
    }
  }
};

// Configuración PayU
const PAYU_CONFIG = {
  apiKey: process.env.PAYU_API_KEY,
  merchantId: process.env.PAYU_MERCHANT_ID,
  accountId: process.env.PAYU_ACCOUNT_ID,
  signatureKey: process.env.PAYU_SIGNATURE_KEY,
  baseUrl: process.env.PAYU_BASE_URL || 'https://sandbox.api.payulatam.com',
  isProduction: process.env.NODE_ENV === 'production'
};

// Configuración PayPal
const PAYPAL_CONFIG = {
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  mode: process.env.PAYPAL_MODE || 'sandbox',
  baseUrl: process.env.PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com'
};

// Función para obtener configuración de producto y moneda
const getProductConfig = (productType, currency = 'USD') => {
  const product = PRODUCTS[productType];
  if (!product) {
    throw new Error(`Producto no encontrado: ${productType}`);
  }

  const currencyConfig = product.currencies[currency];
  if (!currencyConfig) {
    throw new Error(`Moneda no soportada: ${currency} para ${productType}`);
  }

  return {
    ...product,
    currency,
    ...currencyConfig
  };
};

// Función para validar precio
const validatePrice = (productType, amount, currency) => {
  const config = getProductConfig(productType, currency);
  const expectedAmount = parseFloat(config.amount);
  const providedAmount = parseFloat(amount);

  // Permitir una pequeña tolerancia para diferencias de redondeo
  const tolerance = 0.01;
  const isValid = Math.abs(expectedAmount - providedAmount) <= tolerance;

  if (!isValid) {
    throw new Error(`Precio inválido: esperado ${expectedAmount} ${currency}, recibido ${providedAmount} ${currency}`);
  }

  return true;
};

// Función para generar ID único de orden
const generateOrderId = (productType) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${productType}-${timestamp}-${random}`;
};

module.exports = {
  PRODUCTS,
  PAYU_CONFIG,
  PAYPAL_CONFIG,
  getProductConfig,
  validatePrice,
  generateOrderId
};

