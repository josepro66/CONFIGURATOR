// Configuración de PayPal para el frontend (solo Client ID público)
const PAYPAL_CONFIG = {
  // Solo el Client ID público - las credenciales secretas están en el backend
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb', // 'sb' para sandbox, tu Client ID real para producción
  
  // Configuración según el entorno
  mode: import.meta.env.VITE_PAYPAL_MODE || 'sandbox', // 'sandbox' o 'live'
  
  // URLs del backend para procesar pagos
  backendUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  
  // Configuración de monedas soportadas
  supportedCurrencies: ['USD', 'EUR', 'COP'],
  
  // Configuración de productos
  products: {
    beato: {
      name: 'Beato MIDI Controller',
      basePrice: 200.00
    },
    beato16: {
      name: 'Beato16 MIDI Controller',
      basePrice: 250.00
    },
    knobo: {
      name: 'Knobo MIDI Controller',
      basePrice: 150.00
    },
    mixo: {
      name: 'Mixo MIDI Controller',
      basePrice: 200.00
    },
    loopo: {
      name: 'Loopo MIDI Controller',
      basePrice: 110.00
    },
    fado: {
      name: 'Fado MIDI Controller',
      basePrice: 150.00
    }
  }
};

// Función para obtener configuración de producto
const getProductConfig = (productType) => {
  const product = PAYPAL_CONFIG.products[productType];
  if (!product) {
    throw new Error(`Producto no encontrado: ${productType}`);
  }
  return product;
};

// Función para validar moneda
const isValidCurrency = (currency) => {
  return PAYPAL_CONFIG.supportedCurrencies.includes(currency);
};

// Función para obtener configuración de PayPal Script
const getPayPalScriptOptions = () => {
  return {
    clientId: PAYPAL_CONFIG.clientId,
    currency: "USD",
    intent: "capture"
  };
};

export {
  PAYPAL_CONFIG,
  getProductConfig,
  isValidCurrency,
  getPayPalScriptOptions
};
