const { Router } = require('express');
const {
  crearRegistro,
  listarRegistros,
  obtenerRegistro,
  eliminarRegistro,
} = require('../controllers/registros.controller');
const { generarReporte } = require('../controllers/reporte.controller');
const { validarRegistro } = require('../middleware/validacion');
const { generarExcel, generarExcelLista } = require('../controllers/reporte-excel.controller');


const router = Router();

router.post('/',    validarRegistro, crearRegistro);
router.get('/',                      listarRegistros);

router.get('/reporte-excel/:id',   generarExcel);
router.get('/reporte-excel-lista', generarExcelLista);

router.get('/:id',                   obtenerRegistro);
router.delete('/:id',                eliminarRegistro);


// GET /api/registros/:id/reporte  → genera y descarga PDF tipo tarjeta
router.get('/:id/reporte', generarReporte);

// GET /api/registros/:id/firma → devuelve la firma como imagen PNG
router.get('/:id/firma', async (req, res) => {
  const { pool } = require('../db');
  const result = await pool.query(
    'SELECT firma FROM registros_fatiga WHERE id = $1', [req.params.id]
  );
  if (!result.rows.length || !result.rows[0].firma) {
    return res.status(404).json({ ok: false, message: 'Firma no encontrada' });
  }
  const base64 = result.rows[0].firma.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  res.set('Content-Type', 'image/png');
  res.send(buffer);
});

module.exports = router;