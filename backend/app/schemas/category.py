from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class CategoryBase(BaseModel):
    nombre: str = Field(..., max_length=100, description="Nombre de la categoría")
    descripcion: Optional[str] = Field(None, description="Descripción detallada de la categoría")

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100, description="Nombre de la categoría")
    descripcion: Optional[str] = Field(None, description="Descripción detallada de la categoría")

class CategoryResponse(CategoryBase):
    id: UUID
    fecha_creacion: datetime

    class Config:
        from_attributes = True
