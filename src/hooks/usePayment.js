import { useState, useCallback } from 'react';
import apiService from '../services/apiService';
import Swal from 'sweetalert2';

// Hook personalizado para manejar pagos
const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para crear orden PayU
  const createPayUOrder = useCallback(async (productType, currency, productConfig) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createPayUOrder(productType, currency, productConfig);
      
      if (response.success && response.data) {
        // Redirigir al usuario a la URL de pago de PayU
        window.location.href = response.data.paymentUrl;
        return response.data;
      } else {
        throw new Error('Error al crear orden PayU');
      }
    } catch (err) {
      setError(err.message);
      Swal.fire({
        title: 'Error',
        text: `Error al procesar pago con PayU: ${err.message}`,
        icon: 'error',
        confirmButtonColor: '#a259ff'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para crear orden PayPal
  const createPayPalOrder = useCallback(async (productType, currency, productConfig) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createPayPalOrder(productType, currency, productConfig);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Error al crear orden PayPal');
      }
    } catch (err) {
      setError(err.message);
      Swal.fire({
        title: 'Error',
        text: `Error al procesar pago con PayPal: ${err.message}`,
        icon: 'error',
        confirmButtonColor: '#a259ff'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para capturar pago PayPal
  const capturePayPalPayment = useCallback(async (paypalOrderId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.capturePayPalPayment(paypalOrderId);
      
      if (response.success && response.data) {
        Swal.fire({
          title: '¡Pago Exitoso!',
          text: 'Tu pago ha sido procesado correctamente',
          icon: 'success',
          confirmButtonColor: '#a259ff'
        });
        return response.data;
      } else {
        throw new Error('Error al capturar pago PayPal');
      }
    } catch (err) {
      setError(err.message);
      Swal.fire({
        title: 'Error',
        text: `Error al capturar pago: ${err.message}`,
        icon: 'error',
        confirmButtonColor: '#a259ff'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para verificar estado de orden
  const checkOrderStatus = useCallback(async (orderId) => {
    try {
      const response = await apiService.getOrderStatus(orderId);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Error al verificar estado de orden');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Función para obtener configuración de productos
  const getProductsConfig = useCallback(async () => {
    try {
      const response = await apiService.getProductsConfig();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Error al obtener configuración de productos');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Función para verificar salud del servidor
  const checkServerHealth = useCallback(async () => {
    try {
      const response = await apiService.checkHealth();
      return response.success;
    } catch (err) {
      console.error('Error verificando salud del servidor:', err);
      return false;
    }
  }, []);

  // Función para procesar pago con PayU
  const processPayUPayment = useCallback(async (productType, currency, productConfig) => {
    try {
      // Mostrar loading
      Swal.fire({
        title: 'Procesando pago...',
        text: 'Redirigiendo a PayU',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const orderData = await createPayUOrder(productType, currency, productConfig);
      
      // La redirección se maneja automáticamente en createPayUOrder
      return orderData;
    } catch (err) {
      console.error('Error procesando pago PayU:', err);
      throw err;
    }
  }, [createPayUOrder]);

  // Función para procesar pago con PayPal
  const processPayPalPayment = useCallback(async (productType, currency, productConfig) => {
    try {
      // Mostrar loading
      Swal.fire({
        title: 'Procesando pago...',
        text: 'Creando orden en PayPal',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const orderData = await createPayPalOrder(productType, currency, productConfig);
      
      // Cerrar loading
      Swal.close();
      
      return orderData;
    } catch (err) {
      console.error('Error procesando pago PayPal:', err);
      throw err;
    }
  }, [createPayPalOrder]);

  // Función para manejar éxito de PayPal
  const handlePayPalSuccess = useCallback(async (paypalOrderId) => {
    try {
      // Mostrar loading
      Swal.fire({
        title: 'Confirmando pago...',
        text: 'Procesando transacción',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const result = await capturePayPalPayment(paypalOrderId);
      
      return result;
    } catch (err) {
      console.error('Error confirmando pago PayPal:', err);
      throw err;
    }
  }, [capturePayPalPayment]);

  // Función para manejar cancelación de PayPal
  const handlePayPalCancel = useCallback(() => {
    Swal.fire({
      title: 'Pago Cancelado',
      text: 'Has cancelado el proceso de pago',
      icon: 'info',
      confirmButtonColor: '#a259ff'
    });
  }, []);

  // Función para manejar error de PayPal
  const handlePayPalError = useCallback((error) => {
    console.error('Error en PayPal:', error);
    Swal.fire({
      title: 'Error en PayPal',
      text: 'Ocurrió un error durante el proceso de pago',
      icon: 'error',
      confirmButtonColor: '#a259ff'
    });
  }, []);

  return {
    loading,
    error,
    createPayUOrder,
    createPayPalOrder,
    capturePayPalPayment,
    checkOrderStatus,
    getProductsConfig,
    checkServerHealth,
    processPayUPayment,
    processPayPalPayment,
    handlePayPalSuccess,
    handlePayPalCancel,
    handlePayPalError
  };
};

export default usePayment;

