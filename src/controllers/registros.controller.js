// src/controllers/registros.controller.js  — SQL Server
const { pool, poolConnect, sql } = require('../db');

// Columnas de texto sobre las que corre la búsqueda libre general (?q=...)
const COLUMNAS_BUSQUEDA_LIBRE = [
  'nombres', 'dni', 'turno', 'ubicacion',
  'sueno_cantidad', 'sueno_calidad', 'alimentacion', 'medicamentos', 'aptitud',
];

// POST /api/registros
const crearRegistro = async (req, res) => {
  const {
    nombres, dni, turno,
    sueno_cantidad, sueno_calidad,
    alimentacion, medicamentos, aptitud,
    firma, ubicacion,
  } = req.body;

  try {
    await poolConnect;
    const request = pool.request();

    request.input('nombres',        sql.NVarChar(255), nombres);
    request.input('dni',            sql.Char(8),        dni);
    request.input('turno',          sql.NVarChar(20),   turno);
    request.input('sueno_cantidad', sql.NVarChar(50),   sueno_cantidad);
    request.input('sueno_calidad',  sql.NVarChar(20),   sueno_calidad);
    request.input('alimentacion',   sql.NVarChar(5),    alimentacion);
    request.input('medicamentos',   sql.NVarChar(5),    medicamentos);
    request.input('aptitud',        sql.NVarChar(50),   aptitud);
    request.input('firma',          sql.NVarChar(sql.MAX), firma || null);
    request.input('ubicacion',      sql.NVarChar(255),  ubicacion || 'MurWy');

    const result = await request.query(`
      INSERT INTO registros_fatiga
        (nombres, dni, turno, sueno_cantidad, sueno_calidad,
         alimentacion, medicamentos, aptitud, firma, ubicacion)
      OUTPUT
        INSERTED.id, INSERTED.nombres, INSERTED.dni,
        INSERTED.turno, INSERTED.ubicacion, INSERTED.fecha_registro
      VALUES
        (@nombres, @dni, @turno, @sueno_cantidad, @sueno_calidad,
         @alimentacion, @medicamentos, @aptitud, @firma, @ubicacion)
    `);

    return res.status(201).json({
      ok: true,
      message: 'Registro guardado correctamente',
      data: result.recordset[0],
    });
  } catch (err) {
    console.error('Error al guardar registro:', err.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// GET /api/registros
// Query params soportados:
//   q        → búsqueda libre: busca el texto en TODAS las columnas
//              (nombres, dni, turno, ubicación, sueño, calidad,
//              alimentación, medicamentos, aptitud)
//   dni      → filtro PARCIAL por DNI (LIKE, busca desde el primer número)
//   nombres  → filtro parcial por nombre (LIKE)
//   turno    → filtro exacto por turno
//   desde    → fecha/hora mínima (ISO string)
//   hasta    → fecha/hora máxima (ISO string)
//   page     → número de página (default 1)
//   limit    → registros por página (default 20)
const listarRegistros = async (req, res) => {
  const { q, dni, nombres, turno, desde, hasta, page = 1, limit = 20 } = req.query;

  try {
    await poolConnect;
    const request = pool.request();

    const conditions = [];

    // ── Búsqueda libre: una palabra, todas las columnas (OR) ───────────────
    if (q && q.trim()) {
      const orParts = COLUMNAS_BUSQUEDA_LIBRE.map((col) => `${col} LIKE @q`);
      conditions.push(`(${orParts.join(' OR ')})`);
      request.input('q', sql.NVarChar(255), `%${q.trim()}%`);
    }

    // ── DNI: búsqueda parcial desde el primer número ────────────────────────
    if (dni) {
      conditions.push('dni LIKE @dni');
      request.input('dni', sql.NVarChar(20), `${dni}%`);
    }

    if (nombres) {
      conditions.push('nombres LIKE @nombres');
      request.input('nombres', sql.NVarChar(255), `%${nombres}%`);
    }

    if (turno) {
      conditions.push('turno = @turno');
      request.input('turno', sql.NVarChar(20), turno);
    }
    if (desde) {
      conditions.push('fecha_registro >= @desde');
      request.input('desde', sql.DateTime2, new Date(desde));
    }
    if (hasta) {
      conditions.push('fecha_registro <= @hasta');
      request.input('hasta', sql.DateTime2, new Date(hasta));
    }

    const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    request.input('limit',  sql.Int, Number(limit));
    request.input('offset', sql.Int, offset);

    const countResult = await request.query(
      `SELECT COUNT(*) AS total FROM registros_fatiga ${where}`
    );
    const total = countResult.recordset[0].total;

    const result = await request.query(`
      SELECT id, nombres, dni, turno, sueno_cantidad, sueno_calidad,
             alimentacion, medicamentos, aptitud, ubicacion, fecha_registro
      FROM registros_fatiga
      ${where}
      ORDER BY fecha_registro DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return res.json({
      ok: true, total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      data:  result.recordset,
    });
  } catch (err) {
    console.error('Error al listar registros:', err.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// GET /api/registros/:id
const obtenerRegistro = async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;
    const request = pool.request();
    request.input('id', sql.Int, Number(id));
    const result = await request.query(
      'SELECT * FROM registros_fatiga WHERE id = @id'
    );
    if (!result.recordset.length)
      return res.status(404).json({ ok: false, message: 'Registro no encontrado' });
    return res.json({ ok: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Error al obtener registro:', err.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// DELETE /api/registros/:id
const eliminarRegistro = async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;
    const request = pool.request();
    request.input('id', sql.Int, Number(id));
    const result = await request.query(
      'DELETE FROM registros_fatiga OUTPUT DELETED.id WHERE id = @id'
    );
    if (!result.recordset.length)
      return res.status(404).json({ ok: false, message: 'Registro no encontrado' });
    return res.json({ ok: true, message: 'Registro eliminado' });
  } catch (err) {
    console.error('Error al eliminar registro:', err.message);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

module.exports = { crearRegistro, listarRegistros, obtenerRegistro, eliminarRegistro };