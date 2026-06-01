import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# CRÍTICO: cargar variables de entorno ANTES de importar cualquier módulo de la app
# para garantizar que GOOGLE_API_KEY esté disponible cuando langchain_google_genai inicialice.
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.routes import system, chat, category, document, tutorial, auth

# 1. Configuración profesional del Logger del sistema
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger("fiscalia_assistant")

# 2. Definición del Ciclo de Vida (Lifespan) de forma moderna
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Evento de inicio (startup)
    logger.info("El Backend de FiscalIA Assistant ha iniciado correctamente.")
    yield
    # Evento de parada (shutdown)
    logger.info("El Backend de FiscalIA Assistant se está deteniendo.")

# 3. Inicialización de la aplicación FastAPI
app = FastAPI(
    title="FiscalIA Assistant API",
    description="Sistema inteligente de asistencia técnica institucional - Fiscalía Departamental de Tarija",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 4. Configuración del Middleware CORS para Angular
# Permitimos localhost:4200 (desarrollo local de Angular) y sus variantes
origins = [
    "http://localhost:4200",
    "https://localhost:4200",
    "http://127.0.0.1:4200",
    "https://127.0.0.1:4200"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos los métodos HTTP (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Permitir todas las cabeceras personalizadas
)

# 5. Inclusión de Routers Modulares
# Definimos el prefijo /api/v1 para mantener la API versionada
app.include_router(system.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(category.router, prefix="/api/v1")
app.include_router(document.router, prefix="/api/v1")
app.include_router(tutorial.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")



# 6. Redirección amigable de la raíz a la documentación Swagger UI
@app.get("/", include_in_schema=False)
async def redirect_to_docs():
    return RedirectResponse(url="/docs")
