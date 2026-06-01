from pydantic import BaseModel, Field, HttpUrl
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.schemas.category import CategoryResponse

class TutorialBase(BaseModel):
    titulo: str = Field(..., max_length=255, description="Título del tutorial")
    descripcion: Optional[str] = Field(None, description="Descripción detallada del contenido del tutorial")
    url_video: Optional[str] = Field(None, max_length=500, description="URL del video explicativo (ej. YouTube, Vimeo)")
    activo: bool = Field(True, description="Indica si el tutorial está activo y disponible")

class TutorialCreate(TutorialBase):
    categoria_id: Optional[UUID] = Field(None, description="ID de la categoría a la que pertenece el tutorial")

class TutorialUpdate(BaseModel):
    titulo: Optional[str] = Field(None, max_length=255)
    descripcion: Optional[str] = None
    url_video: Optional[str] = Field(None, max_length=500)
    categoria_id: Optional[UUID] = None
    activo: Optional[bool] = None

class TutorialResponse(TutorialBase):
    id: UUID
    categoria_id: Optional[UUID] = None
    fecha_creacion: datetime
    
    # Permite incluir opcionalmente los detalles de la categoría si se realiza un JOIN
    categoria: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True
