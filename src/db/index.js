// src/db/index.js  — SQL Server con mssql
const sql = require('mssql');

const config = {
  server:   process.env.DB_SERVER   || '172.16.24.33\cmpmur',
  database: process.env.DB_NAME     || 'fatiga_db',
  user:     process.env.DB_USER     || 'murti',
  password: process.env.DB_PASSWORD || 'rw,.12a.',
  port:     Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt:                false,  // true si usas Azure
    trustServerCertificate: true,   // para servidores locales/red interna
  },
  pool: {
    max: 10, min: 0, idleTimeoutMillis: 30000,
  },
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

pool.on('error', (err) => {
  console.error('❌ Error en pool SQL Server:', err.message);
});

const initDB = async () => {
  await poolConnect;
  try {
    const request = pool.request();

    // Crear tabla si no existe
    await request.query(`
      IF NOT EXISTS (
        SELECT * FROM sysobjects
        WHERE name='registros_fatiga' AND xtype='U'
      )
      CREATE TABLE registros_fatiga (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        nombres        NVARCHAR(255)  NOT NULL,
        dni            CHAR(8)        NOT NULL,
        turno          NVARCHAR(20)   NOT NULL,
        sueno_cantidad NVARCHAR(50)   NOT NULL,
        sueno_calidad  NVARCHAR(20)   NOT NULL,
        alimentacion   NVARCHAR(5)    NOT NULL,
        medicamentos   NVARCHAR(5)    NOT NULL,
        aptitud        NVARCHAR(50)   NOT NULL,
        firma          NVARCHAR(MAX)  NULL,
        ubicacion      NVARCHAR(255)  NOT NULL DEFAULT 'MurWy',
        fecha_registro DATETIME2      NOT NULL DEFAULT GETDATE()
      );
    `);

    // Migración segura: agregar columna ubicacion si no existe
    await request.query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'registros_fatiga' AND COLUMN_NAME = 'ubicacion'
      )
      ALTER TABLE registros_fatiga
        ADD ubicacion NVARCHAR(255) NOT NULL DEFAULT 'MurWy';
    `);

    console.log('✅ Base de datos SQL Server lista');
  } catch (err) {
    console.error('❌ Error inicializando BD:', err.message);
    throw err;
  }
};

module.exports = { pool, poolConnect, sql, initDB };