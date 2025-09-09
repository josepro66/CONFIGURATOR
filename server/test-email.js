// server/test-email.js
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function main() {
  console.log("📡 Probando conexión con SMTP:", process.env.EMAIL_HOST);

  // Configurar el transporte de correo
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: true, // true para puerto 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // ⬅ Ignora certificados en desarrollo
    }
  });

  try {
    // Enviar correo de prueba
    let info = await transporter.sendMail({
      from: `"Beato Configurator" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: "✅ Correo de prueba desde Beato",
      text: "Hola! Este es un correo de prueba enviado con Nodemailer y Gmail.",
      html: "<h1>Hola!</h1><p>Este es un correo de prueba enviado con <b>Nodemailer</b> y Gmail.</p>"
    });

    console.log("📩 Correo enviado:", info.messageId);
  } catch (err) {
    console.error("❌ Error enviando correo:", err);
  }
}

main();
