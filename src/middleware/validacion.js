const { body, validationResult } = require('express-validator');

const validarRegistro = [
  body('nombres')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 255 }).withMessage('Nombre muy largo'),

  body('dni')
    .trim()
    .matches(/^\d{8}$/).withMessage('El DNI debe tener exactamente 8 dígitos'),

  body('turno')
    .isIn(['Diurno', 'Nocturno']).withMessage('Turno inválido'),

  body('sueno_cantidad')
    .isIn(['Más de 7 horas', 'Menos de 7 horas']).withMessage('Cantidad de sueño inválida'),

  body('sueno_calidad')
    .isIn(['Bueno', 'Malo']).withMessage('Calidad de sueño inválida'),

  body('alimentacion')
    .isIn(['Sí', 'No']).withMessage('Alimentación inválida'),

  body('medicamentos')
    .isIn(['Sí', 'No']).withMessage('Medicamentos inválido'),

  body('aptitud')
    .isIn(['Alerta y despierto', 'No puedo estar alerta']).withMessage('Aptitud inválida'),

  body('firma')
    .optional()
    .isString().withMessage('Firma inválida'),

  // ubicacion: opcional, string libre (nombre del lugar)
  body('ubicacion')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Ubicación muy larga'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        message: 'Datos inválidos',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
      });
    }
    next();
  },
];

module.exports = { validarRegistro };