import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
// import { fileURLToPath } from "url";
import crypto from "crypto";
import nodemailer from "nodemailer";
import emailApp from "./email.js";
import Order from "./models/Order.js";

// Cargar .env desde el directorio actual del proceso
dotenv.config();

console.log("DEBUG MONGO_URI:", process.env.MONGO_URI);

import mongoose from "mongoose";


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error de conexión:", err));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
// Aumentar límites para permitir screenshots base64 en el body
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 👉 Servir archivos estáticos del build
app.use(express.static(path.join(__dirname, "../dist")));

// 👉 Servir frontend en cualquier ruta que no sea /api/*
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

// Montar rutas de envío de email (/api/send-config-email)
app.use(emailApp);

// Healthcheck raíz para probar ngrok fácilmente
app.get('/', (req, res) => {
  res.send('Backend OK - PayU webhook ready');
});

// Guardamos órdenes en memoria (puedes usar Mongo, MySQL, etc.)
const orders = new Map();

// Función para MD5
const md5 = (str) => crypto.createHash("md5").update(str).digest("hex");

// Helper para crear transporter con .env (maneja secure según puerto)
function createMailTransporter() {
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT || 465);
  const secure = port === 465; // Gmail SSL
  const user = process.env.EMAIL_USER || "";
  const pass = process.env.EMAIL_PASS || "";
  
  console.log('[MAIL] Configurando transporter:', { host, port, secure, user: user ? '***' : 'undefined' });
  
  if (!user || !pass) {
    throw new Error('EMAIL_USER y EMAIL_PASS son requeridos');
  }
  
  return nodemailer.createTransport({ 
    host, 
    port, 
    secure, 
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false // Para desarrollo
    }
  });
}

// Transporter global para pruebas de correo
const transporter = createMailTransporter();

// Verificación automática del transporter al iniciar
transporter.verify().then(() => {
  console.log('[MAIL] Transporter verified - SMTP OK');
}).catch((err) => {
  console.error('[MAIL] Transporter verification failed:', err && err.message ? err.message : err);
});

// Log de configuración esencial al iniciar (sin secretos)
// Credenciales con fallback a Sandbox por defecto
const PAYU_API_KEY = process.env.PAYU_API_KEY || "4Vj8eK4rloUd272L48hsrarnUA"; // Sandbox default (API Key)
const PAYU_MERCHANT_ID = process.env.PAYU_MERCHANT_ID || "508029"; // Sandbox Merchant ID
const PAYU_ACCOUNT_ID = process.env.PAYU_ACCOUNT_ID || "512321"; // Sandbox Account ID (Colombia)
const PAYU_ACCOUNT_ID_COP = process.env.PAYU_ACCOUNT_ID_COP || PAYU_ACCOUNT_ID;
const PAYU_ACCOUNT_ID_USD = process.env.PAYU_ACCOUNT_ID_USD || PAYU_ACCOUNT_ID;
const PAYU_ACTION_URL = process.env.PAYU_ACTION_URL || "https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/";
const BASE_URL = process.env.BASE_URL || "http://localhost:4000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5183";

console.log("ENV CHECK:", {
  BASE_URL,
  FRONTEND_URL,
  PAYU_ACTION_URL,
  PAYU_MERCHANT_ID,
  PAYU_ACCOUNT_ID,
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_TO: process.env.EMAIL_TO,
});

/**
 * 1️⃣ Crear orden PayU (ahora asíncrono y guarda en MongoDB)
 */
app.post("/api/payu/create", async (req, res) => {
  const {
    modelo, color, extras, buyerEmail, email, amount,
    currency, referenceCode, botones, perillas, screenshot,
    files, description
  } = req.body;

  const ref = referenceCode && String(referenceCode).trim() !== ''
    ? String(referenceCode)
    : `order_${Date.now()}`;
  const buyer = buyerEmail || email || "";

  // Guardar pedido en MongoDB
  try {
    await Order.create({
      modelo,
      color,
      extras,
      buyerEmail: buyer,
      amount,
      currency,
      referenceCode: ref,
      botones,
      perillas,
      screenshot,
      files,
      status: "PENDING"
    });
    console.log(`[DB] Orden ${ref} creada en la base de datos.`);
  } catch (error) {
    console.error(`[DB] Error al guardar la orden ${ref}:`, error);
    // Si la orden ya existe (por `unique: true` en referenceCode), no es un error fatal.
    // Continuamos para que el usuario pueda reintentar el pago.
    if (error.code !== 11000) {
      return res.status(500).json({ error: "Error interno al guardar la orden." });
    }
    console.log(`[DB] La orden ${ref} ya existía. Permitiendo reintento de pago.`);
  }

  // El resto de tu lógica para PayU
  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(String(amount ?? ''));
  const safeAmount = Number.isFinite(parsedAmount) ? parsedAmount : 185;
  const amountStr = safeAmount.toFixed(2);
  const currencyStr = String(currency || process.env.PAYU_CURRENCY || 'USD').toUpperCase();
  const dynamicAccountId = currencyStr === 'USD' ? PAYU_ACCOUNT_ID_USD : PAYU_ACCOUNT_ID_COP;
  const payuDescription = description || (modelo ? `Pedido ${modelo}` : "Controlador personalizado");

  const signatureStr = `${PAYU_API_KEY}~${PAYU_MERCHANT_ID}~${ref}~${amountStr}~${currencyStr}`;
  const signature = md5(signatureStr);

  const fields = {
    merchantId: PAYU_MERCHANT_ID,
    accountId: dynamicAccountId,
    description: payuDescription,
    referenceCode: ref,
    amount: amountStr,
    tax: "0",
    taxReturnBase: "0",
    currency: currencyStr,
    signature,
    test: "1",
    buyerEmail: buyer,
    confirmationUrl: `${BASE_URL}/api/payu/confirmation`,
    responseUrl: `${FRONTEND_URL}/pago-finalizado`
  };

  res.json({
    action: PAYU_ACTION_URL,
    fields
  });
});

/**
 * 2️⃣ Confirmación de PayU (actualiza estado en MongoDB)
 */
app.post("/api/payu/confirmation", async (req, res) => {
  const orderId = req.body.reference_sale;
  const payuState = req.body.state_pol; // '4' === APROBADO

  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { referenceCode: orderId },
      { status: payuState === '4' ? 'APPROVED' : 'REJECTED', payuState: payuState },
      { new: true }
    );

    if (!updatedOrder) {
      console.warn(`[CONFIRMATION] No se encontró la orden ${orderId} para actualizar.`);
      // Aunque no se encuentre, respondemos OK a PayU para evitar reintentos.
    } else {
      console.log(`[DB] Orden ${orderId} actualizada a estado: ${updatedOrder.status}`);
    }

    res.status(200).send("OK");

    // Solo enviar email si el pago fue aprobado
    if (payuState !== '4') {
      console.log("[CONFIRMATION] Pago no aprobado, no se envía email");
      return;
    }

    // Usamos los datos de `updatedOrder` si existen, si no, los del body de PayU
    const orderData = updatedOrder || req.body;

    // Aquí puedes continuar con tu lógica de envío de email usando orderData
    // ... (código de envío de email) ...

  } catch (error) {
    console.error(`[DB] Error al actualizar la orden ${orderId}:`, error);
    // Aún así, respondemos 200 a PayU para que no siga reintentando.
    return res.status(200).send("OK_WITH_ERROR");
  }
});

// Puerto dinámico que Fly.io asigna
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
});
