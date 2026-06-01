from fastapi import APIRouter, status, Query
from typing import List
from uuid import UUID
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.services import knowledge_service

router = APIRouter(
    prefix="/documents",
    tags=["Gestión de Conocimiento - Documentos"]
)

@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED, summary="Registra un nuevo documento")
def create_document(document: DocumentCreate):
    """Registra la información y metadatos de un archivo físico subido en el sistema."""
    return knowledge_service.create_document(document)

@router.get("/", response_model=List[DocumentResponse], summary="Obtiene todos los documentos")
def get_documents(active_only: bool = Query(False, description="Filtrar solo documentos activos")):
    """Retorna la lista de todos los documentos registrados."""
    return knowledge_service.get_documents(active_only=active_only)

@router.get("/{document_id}", response_model=DocumentResponse, summary="Obtiene un documento por ID")
def get_document(document_id: UUID):
    """Busca los detalles de un documento específico mediante su ID."""
    return knowledge_service.get_document(document_id)

@router.put("/{document_id}", response_model=DocumentResponse, summary="Actualiza un documento")
def update_document(document_id: UUID, document: DocumentUpdate):
    """Actualiza metadatos de un documento como su título, descripción o estado activo."""
    return knowledge_service.update_document(document_id, document)

@router.delete("/{document_id}", status_code=status.HTTP_200_OK, summary="Elimina un documento")
def delete_document(document_id: UUID):
    """Elimina el registro de un documento del sistema de gestión."""
    return knowledge_service.delete_document(document_id)
