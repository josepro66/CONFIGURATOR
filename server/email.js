import dotenv from 'dotenv';
import express from 'express';
import nodemailer from 'nodemailer';
dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" })); // Permitir imágenes base64

// Transporter Nodemailer (usa .env; soporta otros hosts)
function createTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT || 465);
  const secure = port === 465; // Gmail SSL
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

// Ruta para recibir la configuración y enviar el correo
app.post("/api/send-config-email", async (req, res) => {
  const { chasis, botones, perillas, screenshot } = req.body;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Beato Configurator" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: "🎨 Nueva configuración de cliente",
      html: `
        <h2>Configuración del cliente</h2>
        <p><b>Chasis:</b> ${chasis}</p>
        <p><b>Botones:</b> ${botones.join(", ")}</p>
        <p><b>Perillas:</b> ${perillas.join(", ")}</p>
        <p>Vista previa:</p>
        <img src="cid:config_image" style="max-width:500px; border:1px solid #ccc;"/>
      `,
      attachments: screenshot ? [
        {
          filename: "configuracion.png",
          content: String(screenshot).split("base64,")[1],
          encoding: "base64",
          cid: "config_image"
        }
      ] : []
    });

    console.log("✅ Correo enviado con la configuración");
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default app;
