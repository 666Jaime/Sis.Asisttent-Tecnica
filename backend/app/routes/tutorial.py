from fastapi import APIRouter, status, Query
from typing import List
from uuid import UUID
from app.schemas.tutorial import TutorialCreate, TutorialUpdate, TutorialResponse
from app.services import knowledge_service

router = APIRouter(
    prefix="/tutorials",
    tags=["Gestión de Conocimiento - Tutoriales"]
)

@router.post("/", response_model=TutorialResponse, status_code=status.HTTP_201_CREATED, summary="Registra un nuevo tutorial")
def create_tutorial(tutorial: TutorialCreate):
    """Crea un registro de tutorial vinculándolo a una categoría existente si se proporciona."""
    return knowledge_service.create_tutorial(tutorial)

@router.get("/", response_model=List[TutorialResponse], summary="Obtiene todos los tutoriales")
def get_tutorials(active_only: bool = Query(False, description="Filtrar solo tutoriales activos")):
    """Retorna el listado completo de tutoriales registrados, incluyendo información de sus categorías."""
    return knowledge_service.get_tutorials(active_only=active_only)

@router.get("/{tutorial_id}", response_model=TutorialResponse, summary="Obtiene un tutorial por ID")
def get_tutorial(tutorial_id: UUID):
    """Busca un tutorial por su UUID, retornando sus detalles y su categoría."""
    return knowledge_service.get_tutorial(tutorial_id)

@router.put("/{tutorial_id}", response_model=TutorialResponse, summary="Actualiza un tutorial")
def update_tutorial(tutorial_id: UUID, tutorial: TutorialUpdate):
    """Actualiza cualquier campo del tutorial, incluyendo cambiar su vinculación de categoría."""
    return knowledge_service.update_tutorial(tutorial_id, tutorial)

@router.delete("/{tutorial_id}", status_code=status.HTTP_200_OK, summary="Elimina un tutorial")
def delete_tutorial(tutorial_id: UUID):
    """Elimina permanentemente un tutorial del sistema."""
    return knowledge_service.delete_tutorial(tutorial_id)
