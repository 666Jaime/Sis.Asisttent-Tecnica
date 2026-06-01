"""
chat.py (routes)
Endpoints de la API para el asistente FiscalIA con capacidades RAG.

Expone los siguientes endpoints:
- POST /ask: Respuesta completa (JSON) al asistente con contexto documental.
- GET  /ask-stream: Streaming SSE token a token.
- POST /upload-document: Permite subir y procesar documentos PDF/DOCX.
- GET  /stats: Muestra estadísticas de la base de conocimiento.
"""
import os
import uuid
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.schemas.chat import ChatRequest, ChatResponse, DocumentUploadResponse
from app.services.rag_service import answer_question, stream_answer, process_uploaded_document
from app.rag.vector_store import get_collection_stats

logger = logging.getLogger("fiscalia_assistant")

UPLOAD_DIR = "uploads"

router = APIRouter(
    prefix="/chat",
    tags=["Asistente FiscalIA - RAG"]
)


@router.post(
    "/ask",
    response_model=ChatResponse,
    summary="Realiza una consulta al asistente FiscalIA",
    description=(
        "Envía una pregunta al asistente inteligente de la Fiscalía. "
        "El sistema busca información relevante en los documentos oficiales indexados "
        "y genera una respuesta fundamentada usando Google Gemini AI."
    )
)
async def ask_question(request: ChatRequest):
    """
    Endpoint principal de consulta del asistente FiscalIA.
    
    El sistema ejecutará el pipeline RAG completo:
    1. Búsqueda semántica en ChromaDB.
    2. Construcción del prompt con contexto documental.
    3. Generación de respuesta con Google Gemini AI.
    """
    try:
        logger.info(f"Consulta recibida: '{request.question[:60]}...'")
        response = answer_question(request.question)
        return response
    except Exception as e:
        logger.error(f"Error al procesar la consulta: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al procesar la consulta. Verifique que la API Key de Gemini esté configurada correctamente. Detalle: {str(e)}"
        )


@router.get(
    "/ask-stream",
    summary="Chat con streaming SSE (respuesta token a token)",
    description=(
        "Envía una pregunta al asistente RAG y recibe la respuesta token a token "
        "usando Server-Sent Events (SSE). Cada evento tiene la forma: "
        "'data: {\"token\": \"...\", \"done\": false}'. "
        "El último evento incluye 'done: true' y los metadatos de fuentes."
    )
)
async def ask_stream(question: str, topic: str | None = None, keywords: str | None = None):
    """
    Endpoint de streaming para el asistente FiscalIA.
    Se consume vía EventSource / fetch con ReadableStream en el cliente.
    """
    if not question or len(question.strip()) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La pregunta debe tener al menos 5 caracteres.")
    try:
        return StreamingResponse(
            stream_answer(question.strip(), topic=topic, keywords=keywords),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            }
        )
    except Exception as e:
        logger.error(f"Error en streaming: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el streaming del asistente: {str(e)}"
        )


@router.post(
    "/upload-document",
    response_model=DocumentUploadResponse,
    summary="Carga y procesa un documento institucional",
    description=(
        "Permite cargar documentos PDF o DOCX al sistema para ser procesados, "
        "fragmentados e indexados en la base de conocimiento vectorial (ChromaDB). "
        "Una vez indexados, los documentos estarán disponibles para consultas del asistente."
    )
)
async def upload_document(file: UploadFile = File(...)):
    """
    Endpoint para la carga de documentos oficiales de la Fiscalía.
    
    Formatos soportados: .pdf, .docx
    """
    # Validar el tipo de archivo
    allowed_extensions = {".pdf", ".docx", ".doc"}
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no soportado: '{file_extension}'. Formatos válidos: .pdf, .docx"
        )
    
    # Validar el tamaño del archivo (máximo 50 MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB en bytes
    
    # Crear el directorio de uploads si no existe
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Guardar el archivo temporalmente con un nombre único
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        content = await file.read()
        
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="El archivo excede el tamaño máximo permitido de 50 MB."
            )
        
        with open(temp_path, "wb") as f:
            f.write(content)
        
        logger.info(f"Archivo '{file.filename}' guardado temporalmente en '{temp_path}'.")
        
        # Procesar el documento e indexarlo en ChromaDB
        result = process_uploaded_document(temp_path, file.filename)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.message
            )
        
        return result
        
    except HTTPException:
        # Re-lanzar excepciones HTTP sin modificar
        raise
    except Exception as e:
        logger.error(f"Error inesperado al cargar el documento: {e}", exc_info=True)
        # Limpiar archivo temporal en caso de error inesperado
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al procesar el archivo: {str(e)}"
        )


@router.get(
    "/stats",
    summary="Estadísticas de la base de conocimiento",
    description="Devuelve información sobre el número de documentos y fragmentos indexados en ChromaDB."
)
async def get_knowledge_base_stats():
    """
    Endpoint de diagnóstico de la base de conocimiento vectorial.
    Útil para saber cuántos documentos han sido indexados.
    """
    try:
        stats = get_collection_stats()
        return JSONResponse(content=stats)
    except Exception as e:
        logger.error(f"Error al obtener estadísticas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al conectar con ChromaDB."
        )
