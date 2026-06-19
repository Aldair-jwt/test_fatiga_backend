/**
 * reporte.controller.js  (v7 - respuesta en columna correcta)
 */

const path = require('path');
const fs   = require('fs');
const { pool, poolConnect, sql } = require('../db');
const PDFDocument = require('pdfkit');

const mm = (v) => v * 2.8346;

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

// Valor que se considera "bueno" para cada campo
const VALORES_BUENOS = {
  sueno_cantidad: 'Más de 7 horas',
  sueno_calidad:  'Bueno',
  alimentacion:   'No',
  medicamentos:   'No',
  aptitud:        'Alerta y despierto',
};

const PREGUNTAS = [
  {
    titulo:  '1. Cantidad de Sueño',
    detalle: '¿Cuánto ha dormido usted en las últimas 24 horas?',
    campo:   'sueno_cantidad',
  },
  {
    titulo:  '2. Calidad de Sueño',
    detalle: '¿Cómo calificaría la calidad de ese sueño?',
    campo:   'sueno_calidad',
  },
  {
    titulo:  '3. Alimentación',
    detalle: '¿Ha ingerido algún alimento pesado que pueda causarle sueño?',
    campo:   'alimentacion',
  },
  {
    titulo:  '4. Medicamentos/Sustancias/Estrés/Enfermedad',
    detalle: (
      '¿Está tomando medicamentos que puedan afectar su\n' +
      '  concentración o causarle sueño?\n' +
      '¿Está con molestias por alguna enfermedad?\n' +
      '¿Está distraído por temas laborales y/o familiares?'
    ),
    campo:   'medicamentos',
  },
  {
    titulo:  '5. Aptitud para el Trabajo',
    detalle: (
      '¿Se siente seguro de poder completar o continuar su\n' +
      'jornada de trabajo normal el día de hoy?'
    ),
    campo:   'aptitud',
  },
];

const LOGO_PATH     = path.join(__dirname, '../../mur.png');
const FELIZ_PATH    = path.join(__dirname, '../../feliz.png');
const PREGUNTA_PATH = path.join(__dirname, '../../pregunta.png');

// ── Helpers ──────────────────────────────────────────────────────────────────

// Rectángulo relleno + borde
const box = (doc, bx, by, bw, bh, fill, strokeColor = 'black', lw = 0.7) => {
  doc.rect(bx, by, bw, bh).fill(fill);
  doc.lineWidth(lw).rect(bx, by, bw, bh).stroke(strokeColor);
};

// Texto centrado vertical y horizontalmente dentro de una celda
const cellText = (doc, txt, cx, cy, cw, ch, font, size, color) => {
  doc.fillColor(color || 'black').font(font || 'Helvetica').fontSize(size || 8);
  const th = doc.heightOfString(txt, { width: cw - mm(3) });
  doc.text(txt, cx + mm(1.5), cy + (ch - th) / 2, {
    width: cw - mm(3), align: 'center', lineBreak: true,
  });
};

// Icono PNG centrado en celda, con fallback a texto
const iconCell = (doc, imgPath, fallbackChar, cx, cy, cw, ch, iconSize) => {
  const ix = cx + (cw - iconSize) / 2;
  const iy = cy + (ch - iconSize) / 2;
  if (fs.existsSync(imgPath)) {
    doc.image(imgPath, ix, iy, { width: iconSize, height: iconSize });
  } else {
    doc.fillColor('black').font('Helvetica-Bold').fontSize(14)
       .text(fallbackChar, cx, cy + ch / 2 - 7, { width: cw, align: 'center', lineBreak: false });
  }
};

// ── Controller ───────────────────────────────────────────────────────────────

const generarReporte = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;
    const request = pool.request();
    request.input('id', sql.Int, Number(id));
    const result = await request.query(
      'SELECT * FROM registros_fatiga WHERE id = @id'
    );

    if (!result.recordset.length) {
      return res.status(404).json({ ok: false, message: 'Registro no encontrado' });
    }

    const d     = result.recordset[0];
    const fecha = d.fecha_registro ? new Date(d.fecha_registro) : new Date();

    const filename = `fatiga_${d.dni}_${fecha.toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    doc.pipe(res);

    const PAGE_W = 595.28;
    const ML     = mm(20);
    const CW     = PAGE_W - 2 * ML;
    const C1     = CW * 0.625;
    const C2     = CW * 0.1875;
    const C3     = CW * 0.1875;

    let y = mm(18);

    // ── HEADER ──────────────────────────────────────────────────────
    const HDR_H  = mm(22);
    const LOGO_W = mm(38);

    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, ML, y, {
        fit: [LOGO_W, HDR_H], align: 'center', valign: 'center',
      });
    } else {
      doc.fillColor('#4A4A4A').font('Helvetica-Bold').fontSize(13)
         .text('MUR', ML, y + HDR_H / 2 - 7, { width: LOGO_W, align: 'center', lineBreak: false });
    }

    doc.font('Helvetica-Bold').fontSize(13);
    const titleW = CW - LOGO_W - mm(4);
    const titleH = doc.heightOfString('TARJETA DE AUTOEVALUACIÓN DE LA FATIGA', { width: titleW });
    doc.fillColor('black').text(
      'TARJETA DE AUTOEVALUACIÓN DE LA FATIGA',
      ML + LOGO_W + mm(4), y + (HDR_H - titleH) / 2,
      { width: titleW, align: 'center', lineBreak: false }
    );
    y += HDR_H + mm(2);

    // ── UTILIZAR ────────────────────────────────────────────────────
    const UTL_H = mm(17);
    box(doc, ML, y, CW, UTL_H, '#D9D9D9');
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9)
       .text('UTILIZAR', ML + mm(3), y + mm(3), { lineBreak: false });
    doc.font('Helvetica').fontSize(8)
       .text('- Antes de comenzar a trabajar',               ML + mm(7), y + mm(8.5),  { lineBreak: false })
       .text('- En cualquier momento, durante una actividad', ML + mm(7), y + mm(13),   { lineBreak: false });
    y += UTL_H + mm(1);

    // ── TURNO ───────────────────────────────────────────────────────
    const TRN_H = mm(11);
    box(doc, ML,           y, C1, TRN_H, 'white');
    box(doc, ML + C1,      y, C2, TRN_H, 'white');
    box(doc, ML + C1 + C2, y, C3, TRN_H, 'white');

    doc.fillColor('black').font('Helvetica-Bold').fontSize(10)
       .text(`TURNO:   ${d.turno}`, ML + mm(3), y + mm(3.5), { lineBreak: false });

    iconCell(doc, FELIZ_PATH,    '✓', ML + C1,      y, C2, TRN_H, mm(7));
    iconCell(doc, PREGUNTA_PATH, '?', ML + C1 + C2, y, C3, TRN_H, mm(7));
    y += TRN_H; // sin gap entre filas

    // ── PREGUNTAS ───────────────────────────────────────────────────
    for (const p of PREGUNTAS) {
      const nLines  = p.detalle.split('\n').length;
      const RH      = Math.max(mm(18), mm(6) + nLines * mm(5));
      const respVal = String(d[p.campo] || '');
      const esBueno = respVal === VALORES_BUENOS[p.campo];

      // Celdas de fondo
      box(doc, ML,           y, C1, RH, 'white');
      box(doc, ML + C1,      y, C2, RH, 'white');
      box(doc, ML + C1 + C2, y, C3, RH, 'white');

      // Título de la pregunta
      doc.fillColor('black').font('Helvetica-Bold').fontSize(8.5)
         .text(p.titulo, ML + mm(2.5), y + mm(4), { lineBreak: false });

      // Detalle de la pregunta (multi-línea)
      p.detalle.split('\n').forEach((line, i) => {
        doc.fillColor('black').font('Helvetica').fontSize(7.8)
           .text(line, ML + mm(3), y + mm(9.5) + i * mm(4.8), { lineBreak: false });
      });

      // ── Respuesta en la columna correcta ──────────────────────────
      if (esBueno) {
        // Respuesta buena → columna amarilla (carita feliz)
        cellText(doc, respVal, ML + C1, y, C2, RH, 'Helvetica', 8, 'black');
      } else {
        // Respuesta mala → columna azul (signo de pregunta)
        cellText(doc, respVal, ML + C1 + C2, y, C3, RH, 'Helvetica', 8, 'black');
      }

      y += RH; // sin gap entre filas
    }

    // ── NOTA ────────────────────────────────────────────────────────
    y += mm(4);
    const notaTxt = 'Hable con su supervisor si la respuesta se encuentra en la columna';
    doc.fillColor('black').font('Helvetica-Oblique').fontSize(8.5);
    const notaW = doc.widthOfString(notaTxt + '  ');
    const notaX = (PAGE_W - notaW - mm(5)) / 2;
    doc.text(notaTxt + '  ', notaX, y, { lineBreak: false });
    if (fs.existsSync(PREGUNTA_PATH)) {
      doc.image(PREGUNTA_PATH, notaX + notaW, y - mm(0.5), { width: mm(5), height: mm(5) });
    } else {
      doc.text('?', notaX + notaW, y, { lineBreak: false });
    }
    y += mm(10);

    // ── DECLARACIÓN ─────────────────────────────────────────────────
    y += mm(3);

    const empresa  = 'MUR';
    const textDecl =
      `Yo ${d.nombres} identificado con DNI: ${d.dni}, trabajador de la empresa ` +
      `${empresa}, declaro que la autoevaluación realizada es real y se ajusta a mis condiciones de trabajo.`;

    doc.font('Helvetica').fontSize(9);
    const declH = doc.heightOfString(textDecl, { width: CW });

    doc.fillColor('black').font('Helvetica').fontSize(9)
       .text(textDecl, ML, y, { width: CW, align: 'left', lineBreak: true });

    // Subrayado pegado al texto
    const SUB_OFFSET = 8;
    doc.font('Helvetica').fontSize(9);

    const xYo     = ML + doc.widthOfString('Yo ');
    const wNombre = doc.widthOfString(d.nombres);
    doc.moveTo(xYo, y + SUB_OFFSET).lineTo(xYo + wNombre, y + SUB_OFFSET).lineWidth(0.5).stroke('black');

    const xDni = ML + doc.widthOfString(`Yo ${d.nombres} identificado con DNI: `);
    const wDni  = doc.widthOfString(d.dni);
    if (xDni + wDni < ML + CW) {
      doc.moveTo(xDni, y + SUB_OFFSET).lineTo(xDni + wDni, y + SUB_OFFSET).lineWidth(0.5).stroke('black');
    }

    y += declH + mm(10);

    // ── FECHA ────────────────────────────────────────────────────────
    const ubicacion = d.ubicacion || 'MurWy';
    const fechaStr  = `${ubicacion}, ${fecha.getDate()}  de  ${MESES[fecha.getMonth()]}  del ${fecha.getFullYear()}.`;
    doc.fillColor('black').font('Helvetica-Oblique').fontSize(9)
       .text(fechaStr, ML, y, { width: CW, align: 'right', lineBreak: false });
    y += mm(5);

    // ── FIRMA ────────────────────────────────────────────────────────
    const SIG_W = mm(150);
    const SIG_H = mm(25);
    const SIG_X = (PAGE_W - SIG_W) / 2;
    const SIG_Y = y + mm(2);

    if (d.firma) {
      try {
        let b64 = d.firma;
        if (b64.includes(',')) b64 = b64.split(',')[1];
        const imgBuf = Buffer.from(b64, 'base64');
        doc.image(imgBuf, SIG_X, SIG_Y, {
          fit: [SIG_W, SIG_H], align: 'center', valign: 'center',
        });
      } catch (e) {
        console.error('Error insertando firma:', e.message);
      }
    }

    const lineY = SIG_Y + SIG_H + mm(1);
    doc.lineWidth(0.05)
       .moveTo(PAGE_W / 2 - mm(32), lineY)
       .lineTo(PAGE_W / 2 + mm(32), lineY)
       .stroke('black');
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9)
       .text('TRABAJADOR', ML, lineY + mm(2), {
         width: CW, align: 'center', lineBreak: false,
       });

    doc.end();

  } catch (err) {
    console.error('Error generando reporte PDF:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, message: 'Error al generar el reporte' });
    }
  }
};

module.exports = { generarReporte };