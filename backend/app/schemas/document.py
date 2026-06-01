from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class DocumentBase(BaseModel):
    titulo: str = Field(..., max_length=255, description="Título del documento")
    descripcion: Optional[str] = Field(None, description="Descripción detallada del documento")
    nombre_archivo: str = Field(..., max_length=255, description="Nombre físico del archivo almacenado")
    tipo_archivo: str = Field(..., max_length=100, description="Tipo o formato de archivo (ej. pdf, docx, txt)")
    activo: bool = Field(True, description="Indica si el documento está activo y visible para el sistema")

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    titulo: Optional[str] = Field(None, max_length=255)
    descripcion: Optional[str] = None
    nombre_archivo: Optional[str] = Field(None, max_length=255)
    tipo_archivo: Optional[str] = Field(None, max_length=100)
    activo: Optional[bool] = None

class DocumentResponse(DocumentBase):
    id: UUID
    fecha_subida: datetime

    class Config:
        from_attributes = True
