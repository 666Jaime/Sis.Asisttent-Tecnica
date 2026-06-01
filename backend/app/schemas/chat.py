"""
chat.py (schemas)
Esquemas Pydantic para validación de datos en el módulo de chat con IA.

Pydantic garantiza que todas las peticiones y respuestas del sistema RAG
tengan la estructura correcta antes de ser procesadas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class ChatRequest(BaseModel):
    """
    Esquema de validación para una pregunta enviada al asistente.
    """
    question: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Pregunta o consulta del usuario para el asistente FiscalIA.",
        examples=["¿Cuáles son los procedimientos para presentar una denuncia?"]
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "¿Cuál es el procedimiento para presentar una denuncia formal?"
            }
        }


class SourceDocument(BaseModel):
    """
    Representa un fragmento de documento fuente utilizado para generar la respuesta.
    """
    content: str = Field(description="Fragmento del documento que fue utilizado como contexto.")
    file_name: Optional[str] = Field(None, description="Nombre del archivo fuente.")
    page: Optional[int] = Field(None, description="Número de página del fragmento (si aplica).")


class ChatResponse(BaseModel):
    """
    Esquema de respuesta del asistente FiscalIA.
    Incluye la respuesta generada y los documentos fuente que la respaldan.
    """
    answer: str = Field(description="Respuesta generada por el asistente basada en los documentos.")
    sources: List[SourceDocument] = Field(
        default_factory=list,
        description="Lista de fragmentos de documentos utilizados para fundamentar la respuesta."
    )
    model_used: str = Field(description="Nombre del modelo de lenguaje utilizado.")
    fragments_found: int = Field(description="Número de fragmentos relevantes encontrados en la base de conocimiento.")


class DocumentUploadResponse(BaseModel):
    """
    Esquema de respuesta para la carga y procesamiento de documentos.
    """
    message: str = Field(description="Mensaje de confirmación de la operación.")
    file_name: str = Field(description="Nombre del archivo procesado.")
    fragments_indexed: int = Field(description="Número de fragmentos indexados en ChromaDB.")
    success: bool = Field(description="Indica si la operación fue exitosa.")
