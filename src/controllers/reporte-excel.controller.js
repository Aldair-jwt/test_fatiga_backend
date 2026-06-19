/**
 * reporte-excel.controller.js
 */

const { pool, poolConnect, sql } = require('../db');
const ExcelJS = require('exceljs');

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const VALORES_BUENOS = {
  sueno_cantidad: 'Más de 7 horas',
  sueno_calidad:  'Bueno',
  alimentacion:   'No',
  medicamentos:   'No',
  aptitud:        'Alerta y despierto',
};

const CAMPOS = [
  { label: 'Cantidad de Sueño',                  campo: 'sueno_cantidad' },
  { label: 'Calidad de Sueño',                   campo: 'sueno_calidad'  },
  { label: 'Alimentación',                       campo: 'alimentacion'   },
  { label: 'Medicamentos / Sustancias / Estrés', campo: 'medicamentos'   },
  { label: 'Aptitud para el Trabajo',            campo: 'aptitud'        },
];

// Columnas sobre las que corre la búsqueda libre general (?q=...),
// debe coincidir con las usadas en registros.controller.js
const COLUMNAS_BUSQUEDA_LIBRE = [
  'nombres', 'dni', 'turno', 'ubicacion',
  'sueno_cantidad', 'sueno_calidad', 'alimentacion', 'medicamentos', 'aptitud',
];

function calcularResultado(r) {
  const malos = CAMPOS.filter(({ campo }) => r[campo] !== VALORES_BUENOS[campo]).length;
  if (malos === 0) return 'Apto';
  if (malos <= 2)  return 'Precaución';
  return 'No apto';
}

// ── Exportar UN registro por ID ───────────────────────────────────────────────
const generarExcel = async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;
    const request = pool.request();
    request.input('id', sql.Int, Number(id));
    const result = await request.query('SELECT * FROM registros_fatiga WHERE id = @id');

    if (!result.recordset.length)
      return res.status(404).json({ ok: false, message: 'Registro no encontrado' });

    const d     = result.recordset[0];
    const fecha = d.fecha_registro ? new Date(d.fecha_registro) : new Date();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Autoevaluación Fatiga');

    ws.columns = [
      { width: 45 },
      { width: 25 },
      { width: 25 },
    ];

    const border   = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    const center   = { horizontal:'center', vertical:'middle', wrapText:true };
    const left     = { horizontal:'left',   vertical:'middle', wrapText:true };
    const grayFill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFD9D9D9' } };
    const okFill   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFFF00' } };
    const alertFill= { type:'pattern', pattern:'solid', fgColor:{ argb:'FF4472C4' } };
    const whiteFill= { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFFFFF' } };

    // Fila 1 — Título
    ws.mergeCells('A1:C1');
    const t = ws.getCell('A1');
    t.value = 'TARJETA DE AUTOEVALUACIÓN DE LA FATIGA — MUR';
    t.font  = { bold:true, size:13, name:'Arial', color:{ argb:'FFFFFFFF' } };
    t.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF4A4A4A' } };
    t.alignment = center; t.border = border;
    ws.getRow(1).height = 30;

    // Fila 2 — Info trabajador
    ws.mergeCells('A2:C2');
    const fechaStr = `${fecha.getDate()} de ${MESES[fecha.getMonth()]} del ${fecha.getFullYear()}`;
    const info = ws.getCell('A2');
    info.value = `Trabajador: ${d.nombres}   |   DNI: ${d.dni}   |   Turno: ${d.turno}   |   Fecha: ${fechaStr}`;
    info.font  = { size:9, name:'Arial' };
    info.fill  = grayFill; info.alignment = left; info.border = border;
    ws.getRow(2).height = 20;

    // Fila 3 — Cabeceras
    const cabeceras = ['Pregunta', '✓  Respuesta OK', '?  Alerta'];
    const fills3    = [grayFill, okFill, alertFill];
    const colors3   = ['FF000000','FF000000','FFFFFFFF'];
    ['A','B','C'].forEach((col, i) => {
      const cell = ws.getCell(`${col}3`);
      cell.value = cabeceras[i];
      cell.font  = { bold:true, size:9, name:'Arial', color:{ argb: colors3[i] } };
      cell.fill  = fills3[i]; cell.alignment = center; cell.border = border;
    });
    ws.getRow(3).height = 22;

    // Filas de preguntas
    CAMPOS.forEach((p, i) => {
      const rowNum  = i + 4;
      const respVal = String(d[p.campo] || '');
      const esBueno = respVal === VALORES_BUENOS[p.campo];
      ws.getRow(rowNum).height = 28;

      const cA = ws.getCell(`A${rowNum}`);
      cA.value = p.label; cA.font = { size:9, name:'Arial' };
      cA.fill  = whiteFill; cA.alignment = left; cA.border = border;

      const cB = ws.getCell(`B${rowNum}`);
      cB.value = esBueno ? respVal : '';
      cB.fill  = esBueno ? okFill : whiteFill;
      cB.font  = { size:9, name:'Arial' }; cB.alignment = center; cB.border = border;

      const cC = ws.getCell(`C${rowNum}`);
      cC.value = !esBueno ? respVal : '';
      cC.fill  = !esBueno ? alertFill : whiteFill;
      cC.font  = { size:9, name:'Arial', color:{ argb: !esBueno ? 'FFFFFFFF':'FF000000' } };
      cC.alignment = center; cC.border = border;
    });

    const filename = `fatiga_${d.dni}_${fecha.toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Error generando Excel:', err.message);
    if (!res.headersSent) res.status(500).json({ ok: false, message: 'Error al generar el Excel' });
  }
};

// ── Exportar LISTA (con filtros) ──────────────────────────────────────────────
const generarExcelLista = async (req, res) => {
  const { q, desde, hasta, turno, dni, nombres } = req.query;
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

    if (desde)   { request.input('desde',   sql.VarChar, desde);          conditions.push('fecha_registro >= @desde'); }
    if (hasta)   { request.input('hasta',   sql.VarChar, hasta);          conditions.push('fecha_registro <= @hasta'); }
    if (turno)   { request.input('turno',   sql.VarChar, turno);          conditions.push('turno = @turno'); }
    if (dni)     { request.input('dni',     sql.VarChar, `${dni}%`);      conditions.push('dni LIKE @dni'); }
    if (nombres) { request.input('nombres', sql.VarChar, `%${nombres}%`); conditions.push('nombres LIKE @nombres'); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await request.query(
      `SELECT * FROM registros_fatiga ${where} ORDER BY fecha_registro DESC`
    );
    const rows = result.recordset;

    if (!rows.length)
      return res.status(404).json({ ok: false, message: 'Sin registros para los filtros indicados' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Registros Fatiga');

    const border    = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    const center    = { horizontal:'center', vertical:'middle', wrapText:true };
    const left      = { horizontal:'left',   vertical:'middle', wrapText:true };
    const FILL_MALA = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF4472C4' } };
    const FILL_WHITE= { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFFFFF' } };
    const FILL_APTO = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFD9EAD3' } };
    const FILL_PREC = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFF2CC' } };
    const FILL_NO   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFCE5CD' } };

    const COLS = [
      { header:'#',           key:'id',             width:6  },
      { header:'Trabajador',  key:'nombres',         width:28 },
      { header:'DNI',         key:'dni',             width:13 },
      { header:'Turno',       key:'turno',           width:11 },
      { header:'Ubicación',   key:'ubicacion',       width:16 },
      { header:'Sueño cant.', key:'sueno_cantidad',  width:18 },
      { header:'Sueño cal.',  key:'sueno_calidad',   width:15 },
      { header:'Alimentación',key:'alimentacion',    width:14 },
      { header:'Medicamentos',key:'medicamentos',    width:14 },
      { header:'Aptitud',     key:'aptitud',         width:22 },
      { header:'Resultado',   key:'resultado',       width:14 },
      { header:'Fecha',       key:'fecha_registro',  width:20 },
    ];
    ws.columns = COLS;

    // Cabecera
    const hRow = ws.getRow(1);
    hRow.height = 22;
    COLS.forEach((_, i) => {
      const cell = hRow.getCell(i + 1);
      cell.value = COLS[i].header;
      cell.font  = { bold:true, size:9, name:'Arial', color:{ argb:'FFFFFFFF' } };
      cell.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF4A4A4A' } };
      cell.alignment = center; cell.border = border;
    });

    rows.forEach((r) => {
      const resultado = calcularResultado(r);
      const fillRes   = resultado === 'Apto' ? FILL_APTO : resultado === 'Precaución' ? FILL_PREC : FILL_NO;

      const row = ws.addRow({
        id:             r.id,
        nombres:        r.nombres,
        dni:            r.dni,
        turno:          r.turno,
        ubicacion:      r.ubicacion || '',
        sueno_cantidad: r.sueno_cantidad,
        sueno_calidad:  r.sueno_calidad,
        alimentacion:   r.alimentacion,
        medicamentos:   r.medicamentos,
        aptitud:        r.aptitud,
        resultado,
        fecha_registro: r.fecha_registro
          ? new Date(r.fecha_registro).toLocaleString('es-PE') : '',
      });

      row.height = 20;
      row.eachCell((cell, colNum) => {
        cell.font      = { size:9, name:'Arial' };
        cell.alignment = colNum === 2 ? left : center;
        cell.border    = border;

        const campoIdx = colNum - 6; // columnas 6-10 son las respuestas
        if (campoIdx >= 0 && campoIdx < CAMPOS.length) {
          const esMala = r[CAMPOS[campoIdx].campo] !== VALORES_BUENOS[CAMPOS[campoIdx].campo];
          cell.fill = esMala ? FILL_MALA : FILL_WHITE;
          if (esMala) cell.font = { size:9, name:'Arial', color:{ argb:'FFFFFFFF' } };
        } else {
          cell.fill = colNum === 11 ? fillRes : FILL_WHITE;
          if (colNum === 11) cell.font = { bold:true, size:9, name:'Arial' };
        }
      });
    });

    // Fila total
    const tRow = ws.addRow({ nombres: `Total: ${rows.length} registros` });
    tRow.getCell(2).font = { bold:true, size:9, name:'Arial' };
    tRow.getCell(2).alignment = left;
    tRow.eachCell(cell => { cell.border = border; });

    ws.views = [{ state:'frozen', ySplit:1 }];

    const filename = `fatiga_lista_${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Error generando Excel lista:', err.message);
    if (!res.headersSent) res.status(500).json({ ok: false, message: 'Error al generar el Excel' });
  }
};

module.exports = { generarExcel, generarExcelLista };