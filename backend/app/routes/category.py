from fastapi import APIRouter, status, Depends
from typing import List
from uuid import UUID
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services import knowledge_service

router = APIRouter(
    prefix="/categories",
    tags=["Gestión de Conocimiento - Categorías"]
)

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED, summary="Crea una nueva categoría")
def create_category(category: CategoryCreate):
    """Permite registrar una categoría con nombre único y descripción opcional."""
    return knowledge_service.create_category(category)

@router.get("/", response_model=List[CategoryResponse], summary="Obtiene todas las categorías")
def get_categories():
    """Retorna el listado completo de las categorías ordenadas alfabéticamente."""
    return knowledge_service.get_categories()

@router.get("/{category_id}", response_model=CategoryResponse, summary="Obtiene una categoría por ID")
def get_category(category_id: UUID):
    """Busca una categoría en específico a través de su identificador UUID."""
    return knowledge_service.get_category(category_id)

@router.put("/{category_id}", response_model=CategoryResponse, summary="Actualiza parcialmente una categoría")
def update_category(category_id: UUID, category: CategoryUpdate):
    """Actualiza el nombre y/o la descripción de una categoría existente."""
    return knowledge_service.update_category(category_id, category)

@router.delete("/{category_id}", status_code=status.HTTP_200_OK, summary="Elimina una categoría")
def delete_category(category_id: UUID):
    """Elimina permanentemente una categoría si no tiene tutoriales asociados."""
    return knowledge_service.delete_category(category_id)
