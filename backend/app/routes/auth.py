from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.core import supabase
import logging

logger = logging.getLogger("fiscalia_assistant")

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación Supabase"]
)

# ID del administrador obligatorio
ADMIN_USER_ID = "4cb65ccd-f4cf-4aae-8fec-20a2692c503f"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/login", summary="Autentica un usuario con Supabase Auth y valida rol admin")
def login(request: LoginRequest):
    """
    Recibe credenciales de email y contraseña.
    Valida en Supabase y verifica si el UUID del usuario corresponde al Administrador.
    """
    logger.info(f"Intento de autenticación para usuario: {request.email}")
    try:
        # Autenticación nativa con Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not auth_response or not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas o usuario no encontrado."
            )
        
        user = auth_response.user
        session = auth_response.session
        
        # Verificar si el ID del usuario es el del Administrador indicado
        is_admin = str(user.id) == ADMIN_USER_ID
        
        if not is_admin:
            logger.warning(f"Acceso denegado: el ID de usuario {user.id} no es Administrador.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. Este portal es exclusivo para el administrador de la Fiscalía."
            )
            
        logger.info(f"Autenticación exitosa. Administrador '{request.email}' conectado.")
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "admin": True
            },
            "session": {
                "access_token": session.access_token if session else None,
                "token_type": session.token_type if session else "bearer"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error durante el inicio de sesión de Supabase: {e}")
        # Si es error directo de credenciales de Supabase
        if "invalid login credentials" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas. Por favor verifique su correo y contraseña."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el servidor de autenticación: {str(e)}"
        )
