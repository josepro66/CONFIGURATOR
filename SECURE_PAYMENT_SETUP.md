# 🔒 Sistema de Pagos Seguro - Configurador MIDI

## 📋 Resumen

Este sistema refactoriza completamente el manejo de pagos para mover todas las credenciales sensibles al backend y asegurar las transacciones. El frontend ahora solo maneja Client IDs públicos y se comunica con el backend para todas las operaciones de pago.

## 🏗️ Arquitectura

### Backend (Node.js/Express)
- **Puerto**: 3001
- **Base de datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **Seguridad**: Rate limiting, validación, sanitización, CORS seguro
- **Proveedores**: PayU y PayPal con credenciales seguras

### Frontend (React)
- **Puerto**: 3000
- **Credenciales**: Solo Client IDs públicos
- **Comunicación**: API REST con el backend
- **Seguridad**: Sin credenciales sensibles expuestas

## 🚀 Instalación y Configuración

### 1. Instalar dependencias del backend

```bash
cd server
node install-dependencies.js
```

### 2. Configurar variables de entorno

#### Backend (server/.env)
```env
# Configuración del servidor
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Credenciales PayU
PAYU_API_KEY=tu_payu_api_key
PAYU_MERCHANT_ID=tu_payu_merchant_id
PAYU_ACCOUNT_ID=tu_payu_account_id
PAYU_SIGNATURE_KEY=tu_payu_signature_key
PAYU_BASE_URL=https://sandbox.api.payulatam.com

# Credenciales PayPal
PAYPAL_CLIENT_ID=tu_paypal_client_id
PAYPAL_CLIENT_SECRET=tu_paypal_client_secret
PAYPAL_MODE=sandbox

# Configuración de productos y precios
BEATO_PRICE=200.00
BEATO16_PRICE=250.00
KNOBO_PRICE=150.00
MIXO_PRICE=200.00
LOOPO_PRICE=110.00
FADO_PRICE=150.00

# Configuración de seguridad
JWT_SECRET=tu_jwt_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configuración de webhooks
WEBHOOK_SECRET=tu_webhook_secret
```

#### Frontend (.env)
```env
# Configuración de desarrollo
NODE_ENV=development
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_PAYPAL_CLIENT_ID=sb
REACT_APP_PAYPAL_MODE=sandbox
```

### 3. Iniciar servidores

#### Backend
```bash
cd server
npm run dev
```

#### Frontend
```bash
npm run dev
```

## 🔧 Uso en los Configuradores

### 1. Importar el hook de pagos

```javascript
import usePayment from '../hooks/usePayment';
import SecurePaymentModal from '../components/SecurePaymentModal';
```

### 2. Usar el hook en el componente

```javascript
const {
  processPayUPayment,
  processPayPalPayment,
  handlePayPalSuccess,
  handlePayPalCancel,
  handlePayPalError
} = usePayment();

const [showPaymentModal, setShowPaymentModal] = useState(false);

const handleOpenPayment = () => {
  setShowPaymentModal(true);
};
```

### 3. Agregar el modal de pago

```javascript
<SecurePaymentModal
  isOpen={showPaymentModal}
  onClose={() => setShowPaymentModal(false)}
  productType="beato"
  productConfig={chosenColors}
  selectedCurrency={selectedCurrency}
/>
```

## 📡 Endpoints del Backend

### PayU
- `POST /api/payment/payu/create-order` - Crear orden PayU
- `POST /api/payment/webhook/payu` - Webhook PayU

### PayPal
- `POST /api/payment/paypal/create-order` - Crear orden PayPal
- `POST /api/payment/paypal/capture-payment` - Capturar pago PayPal
- `POST /api/payment/webhook/paypal` - Webhook PayPal

### Utilidades
- `GET /api/payment/order/:orderId/status` - Estado de orden
- `GET /api/payment/products/config` - Configuración de productos
- `GET /api/payment/health` - Salud del servidor

## 🔒 Características de Seguridad

### Backend
- ✅ **Rate Limiting**: Previene ataques de fuerza bruta
- ✅ **Validación de entrada**: Sanitiza y valida todos los datos
- ✅ **CORS seguro**: Solo permite orígenes autorizados
- ✅ **Headers de seguridad**: Helmet.js para protección
- ✅ **Validación de precios**: No confía en el frontend
- ✅ **Firmas seguras**: Generación server-side de firmas
- ✅ **Logging de seguridad**: Registra intentos de pago

### Frontend
- ✅ **Sin credenciales sensibles**: Solo Client IDs públicos
- ✅ **Comunicación segura**: HTTPS con el backend
- ✅ **Validación de respuestas**: Verifica todas las respuestas
- ✅ **Manejo de errores**: Errores informativos sin exponer datos

## 🗄️ Base de Datos

### Tablas creadas automáticamente:
- **orders**: Órdenes de pago
- **transactions**: Transacciones procesadas
- **webhooks**: Webhooks recibidos

### Estructura:
```sql
-- Órdenes
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  product_type TEXT NOT NULL,
  product_config TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transacciones
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  payment_provider TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders (order_id)
);

-- Webhooks
CREATE TABLE webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Migración desde el Sistema Anterior

### 1. Remover credenciales del frontend
- Eliminar `PAYU_CONFIG` de `payuConfig.js`
- Actualizar `paypalConfig.js` para usar solo Client ID
- Remover generación de firmas del frontend

### 2. Actualizar configuradores
- Reemplazar lógica de pago directa con llamadas al backend
- Usar `usePayment` hook en lugar de lógica directa
- Implementar `SecurePaymentModal` para UI de pago

### 3. Configurar webhooks
- Configurar URLs de webhook en PayU y PayPal
- Apuntar a: `https://tu-dominio.com/api/payment/webhook/payu`
- Apuntar a: `https://tu-dominio.com/api/payment/webhook/paypal`

## 🧪 Testing

### Verificar instalación
```bash
# Backend
curl http://localhost:3001/health

# Frontend
curl http://localhost:3000
```

### Verificar configuración (desarrollo)
```bash
curl http://localhost:3001/api/config/check
```

### Probar creación de orden
```bash
curl -X POST http://localhost:3001/api/payment/paypal/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "beato",
    "currency": "USD",
    "productConfig": {"chasis": "Red", "buttons": "Blue"}
  }'
```

## 🚨 Consideraciones de Producción

### 1. Variables de entorno
- Usar credenciales de producción
- Configurar `NODE_ENV=production`
- Usar base de datos PostgreSQL

### 2. Seguridad adicional
- Configurar HTTPS
- Implementar autenticación JWT
- Configurar firewall
- Monitoreo de logs

### 3. Escalabilidad
- Usar PM2 o similar para gestión de procesos
- Configurar balanceador de carga
- Implementar cache Redis
- Monitoreo de performance

## 📞 Soporte

### Logs importantes
- Backend: `server/logs/`
- Errores: `server/logs/error.log`
- Pagos: `server/logs/payment.log`

### Comandos útiles
```bash
# Ver logs en tiempo real
tail -f server/logs/payment.log

# Reiniciar servidor
pm2 restart configurator-backend

# Verificar estado
pm2 status
```

## ✅ Checklist de Implementación

- [ ] Instalar dependencias del backend
- [ ] Configurar variables de entorno
- [ ] Iniciar servidor backend
- [ ] Verificar endpoints de salud
- [ ] Actualizar configuradores para usar nuevo sistema
- [ ] Probar pagos en sandbox
- [ ] Configurar webhooks
- [ ] Probar en producción
- [ ] Configurar monitoreo
- [ ] Documentar procedimientos

## 🔗 Enlaces Útiles

- [PayU API Documentation](https://developers.payulatam.com/)
- [PayPal API Documentation](https://developer.paypal.com/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practices-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

