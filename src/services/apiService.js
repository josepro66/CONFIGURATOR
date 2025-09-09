// Servicio de API para comunicarse con el backend de pagos
class ApiService {
  constructor() {
    // Usar import.meta.env para Vite en lugar de process.env
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    this.timeout = 30000; // 30 segundos
  }

  // Función helper para hacer requests HTTP
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: this.timeout,
      ...options
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error en API request a ${endpoint}:`, error);
      throw error;
    }
  }

  // Crear orden PayU
  async createPayUOrder(productType, currency, productConfig) {
    return this.makeRequest('/payment/payu/create-order', {
      method: 'POST',
      body: JSON.stringify({
        productType,
        currency,
        productConfig
      })
    });
  }

  // Crear orden PayPal
  async createPayPalOrder(productType, currency, productConfig) {
    return this.makeRequest('/payment/paypal/create-order', {
      method: 'POST',
      body: JSON.stringify({
        productType,
        currency,
        productConfig
      })
    });
  }

  // Capturar pago PayPal
  async capturePayPalPayment(paypalOrderId) {
    return this.makeRequest('/payment/paypal/capture-payment', {
      method: 'POST',
      body: JSON.stringify({
        paypalOrderId
      })
    });
  }

  // Obtener estado de una orden
  async getOrderStatus(orderId) {
    return this.makeRequest(`/payment/order/${orderId}/status`);
  }

  // Obtener configuración de productos
  async getProductsConfig() {
    return this.makeRequest('/payment/products/config');
  }

  // Verificar salud del servidor
  async checkHealth() {
    return this.makeRequest('/payment/health');
  }
}

// Instancia singleton del servicio
const apiService = new ApiService();

export default apiService;
