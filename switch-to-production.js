#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Cambiando de Sandbox a Producción...\n');

// 1. Cambiar payuConfig.js
const payuConfigPath = path.join(__dirname, 'src', 'payuConfig.js');
let payuConfigContent = fs.readFileSync(payuConfigPath, 'utf8');

// Cambiar URLs de sandbox a producción
payuConfigContent = payuConfigContent.replace(
  /https:\/\/sandbox\.checkout\.payulatam\.com\/ppp-web-gateway-payu\//g,
  'https://checkout.payulatam.com/ppp-web-gateway-payu/'
);

// Cambiar TEST_MODE a false
payuConfigContent = payuConfigContent.replace(
  /TEST_MODE: true/,
  'TEST_MODE: false'
);

// Cambiar URLs de respuesta (necesitarás actualizar esto con tu dominio real)
payuConfigContent = payuConfigContent.replace(
  /CONFIRMATION_URL: 'https:\/\/37afce6068d0\.ngrok-free\.app\/api\/payu\/confirmation'/,
  "CONFIRMATION_URL: 'https://tudominio.com/api/payu/confirmation'"
);

payuConfigContent = payuConfigContent.replace(
  /RESPONSE_URL: 'https:\/\/37afce6068d0\.ngrok-free\.app\/api\/payu\/response'/,
  "RESPONSE_URL: 'https://tudominio.com/pago-finalizado'"
);

fs.writeFileSync(payuConfigPath, payuConfigContent);
console.log('✅ payuConfig.js actualizado para producción');

// 2. Crear backup del archivo actual
const backupPath = path.join(__dirname, 'src', 'payuConfig.sandbox.js');
fs.copyFileSync(payuConfigPath, backupPath);
console.log('✅ Backup creado: payuConfig.sandbox.js');

// 3. Actualizar package.json para incluir script de producción
const packagePath = path.join(__dirname, 'package.json');
let packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

if (!packageContent.scripts) {
  packageContent.scripts = {};
}

packageContent.scripts['build:production'] = 'vite build';
packageContent.scripts['deploy:production'] = 'npm run build:production && gh-pages -d dist';

fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
console.log('✅ package.json actualizado con scripts de producción');

console.log('\n🎉 ¡Cambio a producción completado!');
console.log('\n📋 Próximos pasos:');
console.log('1. Actualizar las credenciales en payuConfig.js con tus datos reales de PayU');
console.log('2. Cambiar las URLs de respuesta con tu dominio real');
console.log('3. Desplegar el backend en un servidor con HTTPS');
console.log('4. Configurar las variables de entorno en el servidor');
console.log('5. Desplegar el frontend en tu dominio');
console.log('6. Configurar webhooks en el panel de PayU');
console.log('\n💡 Para volver a sandbox, ejecuta: node switch-to-sandbox.js');

