const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Instalando dependencias del backend...');

try {
  // Verificar si package.json existe
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json no encontrado en el directorio server/');
    process.exit(1);
  }

  // Instalar dependencias
  console.log('📦 Instalando dependencias con npm...');
  execSync('npm install', { 
    cwd: __dirname, 
    stdio: 'inherit' 
  });

  // Crear directorio data si no existe
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    console.log('📁 Creando directorio data/...');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Verificar si existe archivo .env
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  Archivo .env no encontrado');
    console.log('📝 Copiando env.example a .env...');
    
    const envExamplePath = path.join(__dirname, 'env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ Archivo .env creado. Por favor, configura tus credenciales.');
    } else {
      console.log('❌ Archivo env.example no encontrado');
    }
  }

  console.log('✅ Dependencias instaladas correctamente');
  console.log('');
  console.log('🚀 Para iniciar el servidor:');
  console.log('   npm run dev    # Modo desarrollo');
  console.log('   npm start      # Modo producción');
  console.log('');
  console.log('📋 Próximos pasos:');
  console.log('   1. Configura las credenciales en server/.env');
  console.log('   2. Inicia el servidor con: npm run dev');
  console.log('   3. Verifica que el servidor esté funcionando en: http://localhost:3001/health');

} catch (error) {
  console.error('❌ Error instalando dependencias:', error.message);
  process.exit(1);
}

