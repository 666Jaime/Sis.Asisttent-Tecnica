"""
supabase.py
Cliente de Supabase para FiscalIA Assistant.

IMPORTANTE: Este módulo usa inicialización lazy para que un fallo de
configuración de Supabase NO bloquee el arranque del servidor ni el
pipeline RAG con Google Gemini (que es completamente independiente).
"""
import os
import logging
from typing import Optional

logger = logging.getLogger("fiscalia_assistant")

# El cliente se inicializa la primera vez que se llama a get_supabase_client()
_supabase_client = None
_supabase_initialized = False


def get_supabase_client():
    """
    Devuelve el cliente de Supabase. Si las credenciales no están disponibles,
    devuelve None sin lanzar excepción para no bloquear el pipeline RAG.
    """
    global _supabase_client, _supabase_initialized

    if _supabase_initialized:
        return _supabase_client

    _supabase_initialized = True
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        logger.warning(
            "SUPABASE_URL o SUPABASE_KEY no encontradas. "
            "Las funciones de Supabase (categorías, documentos, tutoriales) estarán deshabilitadas. "
            "El pipeline RAG con Gemini continuará funcionando normalmente."
        )
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info("Cliente de Supabase inicializado correctamente.")
    except Exception as e:
        logger.error(f"Error al inicializar el cliente de Supabase: {e}")
        _supabase_client = None

    return _supabase_client


# Compatibilidad hacia atrás: los módulos que hacen `from app.core import supabase`
# y luego `supabase.table(...)` o `supabase.auth.sign_in_with_password(...)` siguen funcionando.
# Si Supabase no está configurado, get_supabase_client() devuelve None y el error
# se produce en el endpoint específico, no al arrancar toda la app.
supabase = get_supabase_client()
