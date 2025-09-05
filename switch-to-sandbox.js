#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Volviendo a Sandbox...\n');

// 1. Restaurar payuConfig.js desde el backup
const payuConfigPath = path.join(__dirname, 'src', 'payuConfig.js');
const backupPath = path.join(__dirname, 'src', 'payuConfig.sandbox.js');

if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, payuConfigPath);
  console.log('✅ payuConfig.js restaurado desde backup');
} else {
  console.log('⚠️  No se encontró backup, restaurando configuración manual...');
  
  // Restaurar configuración manual
  let payuConfigContent = fs.readFileSync(payuConfigPath, 'utf8');
  
  // Cambiar URLs de producción a sandbox
  payuConfigContent = payuConfigContent.replace(
    /https:\/\/checkout\.payulatam\.com\/ppp-web-gateway-payu\//g,
    'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/'
  );
  
  // Cambiar TEST_MODE a true
  payuConfigContent = payuConfigContent.replace(
    /TEST_MODE: false/,
    'TEST_MODE: true'
  );
  
  // Restaurar URLs de ngrok
  payuConfigContent = payuConfigContent.replace(
    /CONFIRMATION_URL: 'https:\/\/tudominio\.com\/api\/payu\/confirmation'/,
    "CONFIRMATION_URL: 'https://37afce6068d0.ngrok-free.app/api/payu/confirmation'"
  );
  
  payuConfigContent = payuConfigContent.replace(
    /RESPONSE_URL: 'https:\/\/tudominio\.com\/pago-finalizado'/,
    "RESPONSE_URL: 'https://37afce6068d0.ngrok-free.app/api/payu/response'"
  );
  
  fs.writeFileSync(payuConfigPath, payuConfigContent);
  console.log('✅ payuConfig.js restaurado manualmente');
}

console.log('\n🎉 ¡Vuelta a sandbox completada!');
console.log('\n📋 Estado actual:');
console.log('- TEST_MODE: true (sandbox)');
console.log('- URLs: sandbox.checkout.payulatam.com');
console.log('- Webhooks: ngrok (para desarrollo local)');
console.log('\n💡 Para cambiar a producción, ejecuta: node switch-to-production.js');

