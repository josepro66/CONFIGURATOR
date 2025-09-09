// Configuración de base de datos (puedes usar SQLite para desarrollo o PostgreSQL para producción)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión a la base de datos
const dbPath = path.join(__dirname, '../data/orders.db');
const db = new sqlite3.Database(dbPath);

// Inicializar tablas
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabla de órdenes
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
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
        )
      `);

      // Tabla de transacciones
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
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
        )
      `);

      // Tabla de webhooks
      db.run(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          webhook_id TEXT UNIQUE NOT NULL,
          provider TEXT NOT NULL,
          event_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          processed BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'", (err, row) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Base de datos inicializada correctamente');
        resolve();
      }
    });
  });
};

module.exports = {
  db,
  initDatabase
};

