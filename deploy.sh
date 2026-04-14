#!/bin/bash
# =============================================================================
# CADASTRAL SaaS - DEPLOY A GOOGLE CLOUD RUN
# =============================================================================
# Requisitos previos:
#   1. gcloud CLI instalado y autenticado: gcloud auth login
#   2. Docker instalado y corriendo
#   3. Tener un proyecto GCP creado
#
# Uso: bash deploy.sh
# =============================================================================

set -e

# ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
PROJECT_ID="cadastral-rd-prod"          # Cambia por tu Project ID de GCP
REGION="us-central1"                    # Region de Cloud Run
BACKEND_SERVICE="cadastral-backend"
FRONTEND_SERVICE="cadastral-frontend"
DB_INSTANCE="cadastral-pg"             # Nombre del Cloud SQL Instance

# ── COLORES ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── VERIFICACIONES ─────────────────────────────────────────────────────────────
info "Verificando herramientas..."
command -v gcloud &>/dev/null || error "gcloud CLI no encontrado. Instálalo desde https://cloud.google.com/sdk"
command -v docker &>/dev/null || error "Docker no encontrado. Instálalo desde https://docker.com"

info "Configurando proyecto GCP: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# ── HABILITAR APIS ────────────────────────────────────────────────────────────
info "Habilitando APIs necesarias..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project=$PROJECT_ID

# ── ARTIFACT REGISTRY ────────────────────────────────────────────────────────
REPO="gcr.io/$PROJECT_ID"
info "Configurando Artifact Registry..."
gcloud auth configure-docker gcr.io --quiet

# ── BUILD Y PUSH BACKEND ──────────────────────────────────────────────────────
info "Construyendo imagen del backend..."
docker build -t "$REPO/$BACKEND_SERVICE:latest" ./backend
info "Subiendo imagen del backend..."
docker push "$REPO/$BACKEND_SERVICE:latest"

# ── BUILD Y PUSH FRONTEND ────────────────────────────────────────────────────
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE \
  --region=$REGION --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
  warning "Backend URL aún no disponible. El frontend usará la URL del backend tras el primer deploy."
  BACKEND_URL="https://cadastral-backend-XXXX-uc.a.run.app"
fi

info "Construyendo imagen del frontend (API_URL: $BACKEND_URL)..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL=$BACKEND_URL \
  -t "$REPO/$FRONTEND_SERVICE:latest" \
  ./frontend
info "Subiendo imagen del frontend..."
docker push "$REPO/$FRONTEND_SERVICE:latest"

# ── CLOUD SQL ────────────────────────────────────────────────────────────────
info "Verificando instancia Cloud SQL..."
INSTANCE_EXISTS=$(gcloud sql instances list \
  --filter="name=$DB_INSTANCE" --format='value(name)' 2>/dev/null || echo "")

if [ -z "$INSTANCE_EXISTS" ]; then
  info "Creando instancia Cloud SQL PostgreSQL 16..."
  gcloud sql instances create $DB_INSTANCE \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=10GB \
    --no-backup \
    --quiet
  
  gcloud sql databases create cadastral --instance=$DB_INSTANCE
  
  DB_PASSWORD=$(openssl rand -base64 24)
  gcloud sql users set-password postgres \
    --instance=$DB_INSTANCE \
    --password=$DB_PASSWORD
  
  echo "⚠️  GUARDA ESTA CONTRASEÑA: $DB_PASSWORD"
else
  info "Instancia Cloud SQL ya existe: $DB_INSTANCE"
fi

DB_CONNECTION=$(gcloud sql instances describe $DB_INSTANCE \
  --format='value(connectionName)')
info "Connection Name: $DB_CONNECTION"

# ── DEPLOY BACKEND ────────────────────────────────────────────────────────────
info "Desplegando backend en Cloud Run..."
gcloud run deploy $BACKEND_SERVICE \
  --image="$REPO/$BACKEND_SERVICE:latest" \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=4000 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --add-cloudsql-instances=$DB_CONNECTION \
  --set-env-vars="DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@localhost/cadastral?host=/cloudsql/${DB_CONNECTION},PORT=4000,NODE_ENV=production" \
  --set-secrets="JWT_SECRET=jwt-secret:latest" \
  --quiet

BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE \
  --region=$REGION --format='value(status.url)')
info "✅ Backend URL: $BACKEND_URL"

# ── DEPLOY FRONTEND ───────────────────────────────────────────────────────────
info "Reconstruyendo frontend con la URL del backend correcta..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL=$BACKEND_URL \
  -t "$REPO/$FRONTEND_SERVICE:latest" \
  ./frontend
docker push "$REPO/$FRONTEND_SERVICE:latest"

info "Desplegando frontend en Cloud Run..."
gcloud run deploy $FRONTEND_SERVICE \
  --image="$REPO/$FRONTEND_SERVICE:latest" \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --set-env-vars="NEXT_PUBLIC_API_URL=$BACKEND_URL,NODE_ENV=production" \
  --quiet

FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
  --region=$REGION --format='value(status.url)')
info "✅ Frontend URL: $FRONTEND_URL"

# ── RESUMEN ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🚀 DEPLOY COMPLETADO"
echo "═══════════════════════════════════════════════════════════"
echo "  Frontend:  $FRONTEND_URL"
echo "  Backend:   $BACKEND_URL"
echo "  Health:    $BACKEND_URL/health"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📌 Próximos pasos:"
echo "  1. Correr el seed: "
echo "     gcloud run jobs execute cadastral-seed --region=$REGION"
echo "  2. Crear el primer admin:"
echo "     POST $BACKEND_URL/admin/bootstrap"
echo ""
