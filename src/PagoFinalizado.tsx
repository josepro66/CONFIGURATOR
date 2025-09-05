import React from 'react';

const PagoFinalizado: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121527] text-white p-6">
      <div className="max-w-xl w-full text-center bg-[#1e2448] border-2 border-[#a259ff] rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-extrabold text-green-400 mb-3">¡Pago completado!</h1>
        <p className="text-gray-300 mb-6">
          Gracias por tu compra. Hemos recibido tu pedido y te enviaremos un correo con los detalles.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-[0_0_12px_2px_#3b82f6] hover:scale-105 transition-transform"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default PagoFinalizado;


