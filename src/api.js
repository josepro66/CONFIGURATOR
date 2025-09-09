// @ts-nocheck
// Función de fallback para cuando no hay backend disponible
// Los configuradores ahora generan la firma localmente

export async function getPayuSignature({ referenceCode, amount, currency }) {
  // Retornar una firma vacía para evitar errores
  // Los configuradores generan su propia firma usando crypto-js
  console.warn('getPayuSignature: Usando fallback - los configuradores generan firma localmente');
  return '';
} 

export async function getPayuSignatureWithMeta({ referenceCode, amount, currency }) {
  // Retornar datos vacíos para evitar errores
  console.warn('getPayuSignatureWithMeta: Usando fallback - los configuradores generan firma localmente');
  return {
    signature: '',
    signatureStr: '',
    merchantId: '',
    accountId: ''
  };
}