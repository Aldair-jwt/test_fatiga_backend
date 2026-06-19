# Fatiga Backend — Node.js + Express + PostgreSQL

## Estructura
```
fatiga-backend/
├── src/
│   ├── index.js                        ← Entrada principal
│   ├── db/index.js                     ← Conexión y creación de tablas
│   ├── routes/registros.routes.js      ← Rutas API
│   ├── controllers/registros.controller.js
│   └── middleware/validacion.js
├── .env.example
└── package.json
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | /health | Health check |
| POST | /api/registros | Guardar nuevo test |
| GET | /api/registros | Listar registros (con filtros) |
| GET | /api/registros/:id | Obtener uno (con firma) |
| DELETE | /api/registros/:id | Eliminar registro |

### Filtros GET /api/registros
```
?dni=12345678
?turno=Diurno
?desde=2024-01-01&hasta=2024-12-31
?page=1&limit=20
```

## Setup local

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Edita .env con tu DATABASE_URL local
```

### 3. Correr en desarrollo
```bash
npm run dev
```

---

## Deploy en Railway (recomendado)

1. Sube el proyecto a GitHub
2. Ve a **railway.app** → **New Project** → **Deploy from GitHub**
3. Selecciona tu repo
4. Agrega un plugin de **PostgreSQL**: clic en **"+ New"** → **"Database"** → **"PostgreSQL"**
5. Railway agrega `DATABASE_URL` automáticamente como variable de entorno
6. Agrega `FRONTEND_URL` con la URL de tu frontend React
7. Deploy automático ✅

---

## Conectar desde tu frontend React

```javascript
// src/api/fatiga.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Guardar un registro
export const guardarRegistro = async (datos) => {
  const res = await fetch(`${API_URL}/api/registros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  return res.json();
};

// Listar registros
export const listarRegistros = async (filtros = {}) => {
  const params = new URLSearchParams(filtros).toString();
  const res = await fetch(`${API_URL}/api/registros?${params}`);
  return res.json();
};
```

### En tu componente React (envío del formulario):
```javascript
import { guardarRegistro } from './api/fatiga';

const handleSubmit = async () => {
  const resultado = await guardarRegistro({
    nombres: 'García López, Juan',
    dni: '12345678',
    turno: 'Diurno',
    sueno_cantidad: 'Más de 7 horas',
    sueno_calidad: 'Bueno',
    alimentacion: 'No',
    medicamentos: 'No',
    aptitud: 'Alerta y despierto',
    firma: canvasRef.current.toDataURL(), // base64 del canvas
  });

  if (resultado.ok) {
    alert('Registro guardado');
  }
};
```

### Variable de entorno en tu React (.env):
```
VITE_API_URL=https://tu-backend.railway.app
```
