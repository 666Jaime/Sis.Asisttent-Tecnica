from fastapi import APIRouter
from datetime import datetime

router = APIRouter(
    prefix="/system",
    tags=["System"]
)

@router.get("/health", summary="Verifica el estado del servidor")
async def health_check():
    """
    Endpoint de diagnóstico para comprobar que la API del backend está
    activa y responde correctamente a las solicitudes.
    """
    return {
        "status": "online",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "FiscalIA Assistant Backend",
        "version": "1.0.0"
    }
