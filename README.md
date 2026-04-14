# 🏛️ Precios Catastrales RD — SaaS Platform

Plataforma de consulta de valores catastrales oficiales de la República Dominicana, con modelo predictivo de valuación basado en factores de proximidad geográfica.

---

## 🚀 Deploy en Railway (recomendado)

### Requisitos previos
- Cuenta en [railway.app](https://railway.app)
- Repositorio en GitHub con este código
- API Key de Google Maps Platform con **Maps JavaScript API** y **Geocoding API** habilitadas

### Pasos

**1. Crear proyecto en Railway**
```
New Project → Deploy from GitHub Repo → selecciona tu repo
```

**2. Agregar PostgreSQL**
```
+ New → Database → Add PostgreSQL
```
Railway crea la base de datos automáticamente y expone `DATABASE_URL`.

**3. Servicio Backend**
- `+ New → GitHub Repo` → mismo repo
- Settings → **Root Directory**: `backend`
- Settings → **Watch Paths**: `backend/**`

Variables de entorno del backend:
| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | genera con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | URL del frontend de Railway (agregar después) |
| `ADMIN_BOOTSTRAP_SECRET` | una frase secreta tuya |
| `GOOGLE_GEOCODING_API_KEY` | tu API key de Google |

**4. Servicio Frontend**
- `+ New → GitHub Repo` → mismo repo
- Settings → **Root Directory**: `frontend`
- Settings → **Watch Paths**: `frontend/**`

Variables de entorno del frontend:
| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend (ej: `https://backend.up.railway.app`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | tu API key de Google Maps |

**5. Primer despliegue — crear el admin**

Una vez desplegado, registra tu cuenta en `/register` y luego ejecuta:
```bash
curl -X POST https://tu-backend.up.railway.app/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","secret":"TU_ADMIN_BOOTSTRAP_SECRET"}'
```

---

## 💻 Desarrollo local

### Requisitos
- Node.js 20+
- Docker Desktop

### Levantar todo con Docker Compose
```bash
cp .env.example .env
# Edita .env con tus valores
docker-compose up --build
```

La app estará en:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432

### Sin Docker (desarrollo puro)

**Backend:**
```bash
cd backend
cp .env.example .env
# Edita DATABASE_URL con tu postgres local
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
cp .env.local.example .env.local  # o edita .env.local directamente
npm install
npm run dev
```

### Cargar datos y factores de impacto iniciales
```bash
cd backend
npm run seed
```

### Geocodificar zonas (opcional, mejora el heatmap)
```bash
cd backend
# Asegúrate de tener GOOGLE_GEOCODING_API_KEY en .env
npm run geocode
```

---

## 🏗️ Arquitectura

```
├── frontend/          # Next.js 14 + Tailwind + Framer Motion
│   ├── app/           # Pages (App Router)
│   │   ├── page.tsx           # Home / búsqueda
│   │   ├── login/             # Autenticación
│   │   ├── register/          # Registro
│   │   ├── dashboard/         # Panel de usuario
│   │   ├── admin/             # Panel de administrador
│   │   └── api-docs/          # Documentación de la API
│   └── components/    # Navbar, ResultCard, LocationMap, etc.
│
├── backend/           # Express + Prisma + TypeScript
│   ├── src/
│   │   ├── controllers/       # Lógica de negocio
│   │   ├── routes/            # Endpoints REST
│   │   ├── services/          # PDF, Valuación
│   │   ├── middleware/        # Auth, Rate Limit, Logging
│   │   └── utils/seed.ts      # Carga de datos + Geocoding
│   └── prisma/schema.prisma   # Modelos de base de datos
│
└── docker-compose.yml # Orquestación local
```

---

## 📡 API Reference

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/provincias` | Lista de provincias |
| GET | `/api/municipios?provincia=X` | Municipios de una provincia |
| GET | `/api/buscar?q=naco` | Búsqueda global |
| GET | `/api/consulta?provincia=X&municipio=Y` | Consulta filtrada |
| GET | `/api/evaluate/:zoneId?lat=X&lng=Y` | Valuación proyectada con IA |
| GET | `/api/reports/generate/:id` | Descarga PDF |
| GET | `/api/heatmap?provincia=X` | Datos para heatmap |
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Perfil del usuario autenticado |
| POST | `/admin/bootstrap` | Crear primer admin |

---

## 🔐 Roles y Planes

| Rol | Plan | Consultas/15min | Reportes PDF | API Keys |
|-----|------|-----------------|--------------|----------|
| FREE | FREE | 30 | Sí (básicos) | No |
| PRO | BASIC | 300 | Sí (completos) | Sí |
| PRO | PROFESSIONAL | 1,500 | Sí | Sí |
| ADMIN | ENTERPRISE | Ilimitadas | Sí | Sí |

Para cambiar el plan de un usuario, usa el Panel de Administración → Usuarios.

---

## 📝 Variables de Entorno

### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/cadastral?schema=public
JWT_SECRET=genera_uno_de_64_chars
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ADMIN_BOOTSTRAP_SECRET=tu_secreto_seguro
GOOGLE_GEOCODING_API_KEY=tu_api_key
CONTACT_WHATSAPP=+1-809-000-0000
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=tu_api_key_de_maps
```

---

© 2026 Cadastral RD Platform · Santo Domingo, República Dominicana
