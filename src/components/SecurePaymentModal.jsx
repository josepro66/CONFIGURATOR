import React, { useState, useEffect } from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { getPayPalScriptOptions } from '../config/paypalConfig';
import usePayment from '../hooks/usePayment';
import Swal from 'sweetalert2';

const SecurePaymentModal = ({ 
  isOpen, 
  onClose, 
  productType, 
  productConfig, 
  selectedCurrency = 'USD' 
}) => {
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [productsConfig, setProductsConfig] = useState(null);
  
  const {
    loading,
    error,
    processPayUPayment,
    processPayPalPayment,
    handlePayPalSuccess,
    handlePayPalCancel,
    handlePayPalError,
    getProductsConfig,
    checkServerHealth
  } = usePayment();

  // Cargar configuración de productos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadProductsConfig();
      checkServerConnection();
    }
  }, [isOpen]);

  const loadProductsConfig = async () => {
    try {
      const config = await getProductsConfig();
      setProductsConfig(config);
    } catch (error) {
      console.error('Error cargando configuración de productos:', error);
    }
  };

  const checkServerConnection = async () => {
    const isHealthy = await checkServerHealth();
    if (!isHealthy) {
      Swal.fire({
        title: 'Error de Conexión',
        text: 'No se puede conectar con el servidor de pagos. Inténtalo de nuevo más tarde.',
        icon: 'error',
        confirmButtonColor: '#a259ff'
      });
    }
  };

  const handlePayUPayment = async () => {
    try {
      await processPayUPayment(productType, selectedCurrency, productConfig);
    } catch (error) {
      console.error('Error procesando pago PayU:', error);
    }
  };

  const handlePayPalPayment = async () => {
    try {
      const orderData = await processPayPalPayment(productType, selectedCurrency, productConfig);
      return orderData;
    } catch (error) {
      console.error('Error procesando pago PayPal:', error);
      throw error;
    }
  };

  const getProductInfo = () => {
    if (!productsConfig || !productsConfig[productType]) {
      return { name: 'Producto', amount: '0.00', symbol: '$' };
    }
    
    const product = productsConfig[productType][selectedCurrency];
    return product || { name: 'Producto', amount: '0.00', symbol: '$' };
  };

  const productInfo = getProductInfo();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Procesar Pago</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Información del producto */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">{productInfo.name}</h3>
          <p className="text-gray-300 mb-2">Configuración personalizada</p>
          <div className="text-2xl font-bold text-green-400">
            {productInfo.symbol}{productInfo.amount} {selectedCurrency}
          </div>
        </div>

        {/* Selector de método de pago */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Método de Pago</h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="paypal"
                checked={paymentMethod === 'paypal'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-blue-600"
              />
              <span className="text-white">PayPal</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="payu"
                checked={paymentMethod === 'payu'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-blue-600"
              />
              <span className="text-white">PayU</span>
            </label>
          </div>
        </div>

        {/* Botones de pago */}
        <div className="space-y-4">
          {paymentMethod === 'paypal' ? (
            <PayPalScriptProvider options={getPayPalScriptOptions()}>
              <PayPalButtons
                createOrder={handlePayPalPayment}
                onApprove={async (data, actions) => {
                  try {
                    await handlePayPalSuccess(data.orderID);
                    onClose();
                  } catch (error) {
                    console.error('Error aprobando pago PayPal:', error);
                  }
                }}
                onCancel={handlePayPalCancel}
                onError={handlePayPalError}
                style={{
                  layout: 'vertical',
                  color: 'blue',
                  shape: 'rect',
                  label: 'pay'
                }}
              />
            </PayPalScriptProvider>
          ) : (
            <button
              onClick={handlePayUPayment}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Procesando...' : 'Pagar con PayU'}
            </button>
          )}
        </div>

        {/* Información de seguridad */}
        <div className="mt-6 p-4 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-300 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Pago procesado de forma segura</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurePaymentModal;

