import logging
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from app.core import supabase
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.schemas.tutorial import TutorialCreate, TutorialUpdate, TutorialResponse

logger = logging.getLogger("fiscalia_assistant")

# =====================================================================
# SERVICIO DE CATEGORÍAS
# =====================================================================

def create_category(category: CategoryCreate) -> dict:
    """Crea una nueva categoría en la base de datos."""
    logger.info(f"Creando nueva categoría: {category.nombre}")
    try:
        data = category.model_dump()
        response = supabase.table("categorias").insert(data).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo crear la categoría."
            )
        return response.data[0]
    except Exception as e:
        logger.error(f"Error al crear categoría: {e}")
        # Si es un error de duplicado (Postgres 23505)
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La categoría '{category.nombre}' ya existe."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def get_category(category_id: UUID) -> dict:
    """Obtiene una categoría por su ID."""
    logger.info(f"Obteniendo categoría con ID: {category_id}")
    try:
        response = supabase.table("categorias").select("*").eq("id", str(category_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Categoría con ID {category_id} no encontrada."
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener categoría {category_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def get_categories() -> List[dict]:
    """Obtiene el listado de todas las categorías."""
    logger.info("Obteniendo listado de categorías")
    try:
        response = supabase.table("categorias").select("*").order("nombre").execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error al obtener categorías: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def update_category(category_id: UUID, category: CategoryUpdate) -> dict:
    """Actualiza parcialmente una categoría."""
    logger.info(f"Actualizando categoría con ID: {category_id}")
    # Verificar que existe
    get_category(category_id)
    try:
        data = category.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se enviaron datos para actualizar."
            )
        response = supabase.table("categorias").update(data).eq("id", str(category_id)).execute()
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar categoría {category_id}: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de categoría ya está en uso."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def delete_category(category_id: UUID) -> dict:
    """Elimina una categoría de la base de datos."""
    logger.info(f"Eliminando categoría con ID: {category_id}")
    get_category(category_id)
    try:
        response = supabase.table("categorias").delete().eq("id", str(category_id)).execute()
        return {"message": "Categoría eliminada exitosamente.", "id": category_id}
    except Exception as e:
        logger.error(f"Error al eliminar categoría {category_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la categoría. Asegúrese de que no tenga tutoriales asociados. Detalle: {str(e)}"
        )


# =====================================================================
# SERVICIO DE DOCUMENTOS
# =====================================================================

def create_document(document: DocumentCreate) -> dict:
    """Crea un registro de documento en la base de datos."""
    logger.info(f"Registrando nuevo documento en DB: {document.titulo}")
    try:
        data = document.model_dump()
        response = supabase.table("documentos").insert(data).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo registrar el documento."
            )
        return response.data[0]
    except Exception as e:
        logger.error(f"Error al registrar documento: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def get_document(document_id: UUID) -> dict:
    """Obtiene un documento por su ID."""
    logger.info(f"Obteniendo documento con ID: {document_id}")
    try:
        response = supabase.table("documentos").select("*").eq("id", str(document_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Documento con ID {document_id} no encontrado."
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener documento {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def get_documents(active_only: bool = False) -> List[dict]:
    """Obtiene el listado de documentos."""
    logger.info(f"Obteniendo listado de documentos (solo activos: {active_only})")
    try:
        query = supabase.table("documentos").select("*")
        if active_only:
            query = query.eq("activo", True)
        response = query.order("fecha_subida", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error al obtener documentos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def update_document(document_id: UUID, document: DocumentUpdate) -> dict:
    """Actualiza parcialmente un documento."""
    logger.info(f"Actualizando documento con ID: {document_id}")
    get_document(document_id)
    try:
        data = document.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se enviaron datos para actualizar."
            )
        response = supabase.table("documentos").update(data).eq("id", str(document_id)).execute()
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar documento {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def delete_document(document_id: UUID) -> dict:
    """Elimina un documento."""
    logger.info(f"Eliminando documento con ID: {document_id}")
    get_document(document_id)
    try:
        response = supabase.table("documentos").delete().eq("id", str(document_id)).execute()
        return {"message": "Documento eliminado exitosamente.", "id": document_id}
    except Exception as e:
        logger.error(f"Error al eliminar documento {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )


# =====================================================================
# SERVICIO DE TUTORIALES
# =====================================================================

def create_tutorial(tutorial: TutorialCreate) -> dict:
    """Crea un registro de tutorial."""
    logger.info(f"Registrando nuevo tutorial en DB: {tutorial.titulo}")
    
    # Validar que la categoría exista si se proporcionó categoria_id
    if tutorial.categoria_id:
        get_category(tutorial.categoria_id)
        
    try:
        data = tutorial.model_dump()
        response = supabase.table("tutoriales").insert(data).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo registrar el tutorial."
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al registrar tutorial: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def get_tutorial(tutorial_id: UUID) -> dict:
    """Obtiene un tutorial por su ID, incluyendo detalles de su categoría."""
    logger.info(f"Obteniendo tutorial con ID: {tutorial_id}")
    try:
        # Hacemos un join de postgres relacional si es posible, o lo consultamos por separado
        # Para supabase python, podemos hacer select("*, categorias(*)") para traer los datos anidados
        response = supabase.table("tutoriales").select("*, categorias(*)").eq("id", str(tutorial_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tutorial con ID {tutorial_id} no encontrado."
            )
        
        raw_data = response.data[0]
        # Mapeamos la propiedad anidada 'categorias' al formato 'categoria' requerido por el esquema
        if "categorias" in raw_data:
            raw_data["categoria"] = raw_data.pop("categorias")
            
        return raw_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener tutorial {tutorial_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def get_tutorials(active_only: bool = False) -> List[dict]:
    """Obtiene la lista de tutoriales con sus categorías."""
    logger.info(f"Obteniendo listado de tutoriales (solo activos: {active_only})")
    try:
        query = supabase.table("tutoriales").select("*, categorias(*)")
        if active_only:
            query = query.eq("activo", True)
        response = query.order("fecha_creacion", desc=True).execute()
        
        results = []
        for raw_item in (response.data or []):
            if "categorias" in raw_item:
                raw_item["categoria"] = raw_item.pop("categorias")
            results.append(raw_item)
            
        return results
    except Exception as e:
        logger.error(f"Error al obtener tutoriales: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def update_tutorial(tutorial_id: UUID, tutorial: TutorialUpdate) -> dict:
    """Actualiza parcialmente un tutorial."""
    logger.info(f"Actualizando tutorial con ID: {tutorial_id}")
    get_tutorial(tutorial_id)
    
    if tutorial.categoria_id:
        get_category(tutorial.categoria_id)
        
    try:
        data = tutorial.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se enviaron datos para actualizar."
            )
        response = supabase.table("tutoriales").update(data).eq("id", str(tutorial_id)).execute()
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar tutorial {tutorial_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

def delete_tutorial(tutorial_id: UUID) -> dict:
    """Elimina un tutorial."""
    logger.info(f"Eliminando tutorial con ID: {tutorial_id}")
    get_tutorial(tutorial_id)
    try:
        response = supabase.table("tutoriales").delete().eq("id", str(tutorial_id)).execute()
        return {"message": "Tutorial eliminado exitosamente.", "id": tutorial_id}
    except Exception as e:
        logger.error(f"Error al eliminar tutorial {tutorial_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )
