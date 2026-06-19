require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const registrosRoutes = require('./routes/registros.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────
// Permite peticiones desde tu frontend React
app.use(cors({
  origin: [
    // process.env.FRONTEND_URL,        // URL de producción de tu React
    'http://localhost:5173',          // Vite dev
    'http://localhost:3000',          // CRA dev
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://172.16.24.255:3000',  // ← tu IP local
  ].filter(Boolean),
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

// ─── BODY PARSER ──────────────────────────────────────────────
// limit 10mb para aceptar la firma en base64
app.use(express.json({ limit: '10mb' }));

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, status: 'running' }));

// ─── RUTAS ────────────────────────────────────────────────────
app.use('/api/registros', registrosRoutes);

// ─── 404 ──────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ ok: false, message: 'Ruta no encontrada' }));

// ─── ERROR GLOBAL ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, message: 'Error interno del servidor' });
});

// ─── ARRANQUE ─────────────────────────────────────────────────
initDB()
  .then(() => {
    // app.listen(PORT, () => {
    //   console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    // });
    app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  });
