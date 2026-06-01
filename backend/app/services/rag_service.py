"""
rag_service.py
Servicio orquestador del pipeline RAG para FiscalIA Assistant.

Este módulo implementa el flujo completo de Retrieval-Augmented Generation:
1. Recibe una pregunta del usuario.
2. Busca los fragmentos más relevantes en ChromaDB.
3. Construye un prompt con el contexto encontrado.
4. Envía el prompt a Google Gemini para generar la respuesta (normal o streaming).
5. Devuelve la respuesta junto con los documentos fuente.
"""
import json
import logging
import os
from typing import List, Generator
from dotenv import load_dotenv

# Garantizar que la API Key esté disponible en este módulo
load_dotenv()

from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

from app.rag.vector_store import search_similar_documents, add_documents_to_store
from app.rag.document_loader import load_document
from app.schemas.chat import ChatResponse, SourceDocument, DocumentUploadResponse

logger = logging.getLogger("fiscalia_assistant")

# Configuración del modelo de lenguaje basado en Google Gemini
# Usar gemini-2.0-flash que es el modelo flash más reciente disponible
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
RETRIEVER_K = 5
RETRIEVER_SCORE_THRESHOLD = 0.12

if not GOOGLE_API_KEY:
    logger.error(
        "GOOGLE_API_KEY no encontrada en las variables de entorno. "
        "El asistente no podrá generar respuestas. "
        "Verifique el archivo .env del backend."
    )

# Directorio donde se guardarán temporalmente los archivos subidos
UPLOAD_DIR = "uploads"


def _get_llm_stream() -> ChatGoogleGenerativeAI:
    """Crea y devuelve una instancia del modelo Gemini con streaming habilitado.
    Usar exclusivamente en stream_answer() para respuestas token a token."""
    return ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        google_api_key=GOOGLE_API_KEY,
        api_version="v1",
        streaming=True,
        temperature=0.3
    )


def _get_llm_sync() -> ChatGoogleGenerativeAI:
    """Crea y devuelve una instancia del modelo Gemini sin streaming.
    Usar exclusivamente en answer_question() para respuestas completas JSON."""
    return ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        google_api_key=GOOGLE_API_KEY,
        api_version="v1",
        streaming=False,
        temperature=0.3
    )



def _build_prompt() -> PromptTemplate:
    """
    Construye el template de prompt para el asistente jurídico institucional.
    """
    template = """Eres FiscalIA Assistant, el asistente técnico inteligente de la Fiscalía Departamental de Tarija, Bolivia.

Tu función es responder preguntas sobre procedimientos, normativas, resoluciones y documentos oficiales de la institución.

INSTRUCCIONES:
- Responde ÚNICAMENTE basándote en el CONTEXTO de los documentos oficiales proporcionado a continuación.
- Sé conciso, claro y directo. Evita introducciones, saludos, preámbulos o relleno innecesario.
- Responde directamente con la información técnica pertinente.
- NO menciones ni cites el nombre del documento en tu respuesta. Las fuentes se muestran por separado.
- Si el contexto no contiene información suficiente, indícalo brevemente.
- Usa siempre un lenguaje formal institucional y preciso en español.

CONTEXTO DE DOCUMENTOS OFICIALES:
{context}

PREGUNTA DEL USUARIO:
{question}

RESPUESTA DEL ASISTENTE:"""


    return PromptTemplate(
        input_variables=["context", "question"],
        template=template
    )


def _clean_file_name(raw_name: str) -> str:
    """
    Elimina el prefijo UUID del nombre de archivo.
    Ej: '87f1a38f-d214_GUIA CORREO.pdf' -> 'GUIA CORREO.pdf'
    """
    import re
    # Patron UUID seguido de guion bajo: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx_
    cleaned = re.sub(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_', '', raw_name, flags=re.IGNORECASE)
    return cleaned


def _build_context_and_sources(question: str):
    """
    Recupera fragmentos relevantes de ChromaDB y construye el contexto
    y la lista de fuentes para ser reutilizado por answer_question y stream_answer.
    Busca con k=RETRIEVER_K y umbral más flexible para mayor cobertura de coincidencias.
    """
    relevant_docs: List[Document] = search_similar_documents(query=question, k=RETRIEVER_K, score_threshold=RETRIEVER_SCORE_THRESHOLD)
    if not relevant_docs:
        return None, None, []

    # Construir contexto con nombres limpios (sin UUID)
    context_parts = []
    for i, doc in enumerate(relevant_docs, 1):
        raw_name = doc.metadata.get("file_name", "Documento desconocido")
        clean_name = _clean_file_name(raw_name)
        context_parts.append(f"[Fuente {i} - {clean_name}]:\n{doc.page_content}")
    context = "\n\n---\n\n".join(context_parts)

    # Fuentes con nombre limpio (sin UUID), sin repetidos por documento
    seen_names = set()
    sources = []
    for doc in relevant_docs:
        raw_name = doc.metadata.get("file_name", "Documento desconocido")
        clean_name = _clean_file_name(raw_name)
        if clean_name not in seen_names:
            seen_names.add(clean_name)
            sources.append(
                SourceDocument(
                    content=doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    file_name=clean_name,
                    page=doc.metadata.get("page")
                )
            )
    return context, relevant_docs, sources


def _normalize_keywords(raw_keywords: str | None) -> list[str]:
    if not raw_keywords:
        return []
    return [kw.strip().lower() for kw in raw_keywords.split(',') if kw.strip()]


def _check_control_rules(question: str) -> ChatResponse | None:
    """Aplica reglas IF-THEN de control antes de ejecutar el pipeline RAG."""
    normalized = question.strip().lower()

    if not normalized:
        return ChatResponse(
            answer="La pregunta está vacía. Por favor formule su consulta con palabras clave claras.",
            sources=[],
            model_used=LLM_MODEL,
            fragments_found=0
        )

    if len(normalized) < 5:
        return ChatResponse(
            answer="La pregunta es demasiado breve. Por favor describa mejor su consulta.",
            sources=[],
            model_used=LLM_MODEL,
            fragments_found=0
        )

    sensitive_terms = ["contraseña", "password", "clave", "pin"]
    password_recovery_triggers = ["olvid", "recuper", "restablec", "reset", "cambiar", "cambio"]
    password_denial_phrases = [
        "dame", "envia", "envíame", "compartir", "comparte",
        "revelar", "revela", "mostrar", "muéstrame",
        "mi contraseña", "mi password", "tu contraseña", "tu password",
        "cual es mi contraseña", "cual es tu contraseña", "¿cual es mi contraseña",
        "¿cual es tu contraseña", "¿cuál es mi contraseña", "¿cuál es tu contraseña"
    ]

    if any(term in normalized for term in sensitive_terms):
        if any(trigger in normalized for trigger in password_recovery_triggers):
            pass
        elif any(phrase in normalized for phrase in password_denial_phrases):
            return ChatResponse(
                answer="No está permitido solicitar ni compartir contraseñas o datos sensibles. Consulte el área de seguridad de TI.",
                sources=[],
                model_used=LLM_MODEL,
                fragments_found=0
            )

    denuncia_terms = ["denuncia", "denunciar", "presentar denuncia", "hacer denuncia"]
    if any(term in normalized for term in denuncia_terms):
        logger.info("[RULE] Detectada consulta sobre denuncias. Buscando recursos específicos.")

    return None


def _augment_question(question: str, topic: str | None = None, keywords: str | None = None) -> str:
    parts = [question.strip()]
    if topic and topic.lower() != 'general':
        parts.append(f"tema: {topic}")
    parsed_keywords = _normalize_keywords(keywords)
    if parsed_keywords:
        parts.append(' '.join(parsed_keywords))
    return ' '.join(parts)


def stream_answer(question: str, topic: str | None = None, keywords: str | None = None) -> Generator[str, None, None]:
    """
    Pipeline RAG con streaming token a token.
    Emite eventos SSE con el formato 'data: {json}\n\n' para que el frontend
    pueda mostrar la respuesta en tiempo real mientras se genera.
    """
    logger.info(f"[STREAM] Nueva consulta: '{question[:80]}' | topic={topic} | keywords={keywords}")

    rule_response = _check_control_rules(question)
    if rule_response is not None:
        yield f"data: {json.dumps({'token': rule_response.answer, 'done': False})}\n\n"
        yield f"data: {json.dumps({'token': '', 'done': True, 'sources': [], 'fragments_found': 0})}\n\n"
        return

    augmented_query = _augment_question(question, topic=topic, keywords=keywords)

    context, relevant_docs, sources = _build_context_and_sources(augmented_query)

    # Sin contexto: emitir mensaje único y cerrar
    if context is None:
        no_ctx_msg = "No se pudo encontrar una respuesta a su duda en los documentos oficiales. Por favor, comuníquese con el administrador del sistema."
        yield f"data: {json.dumps({'token': no_ctx_msg, 'done': False})}\n\n"
        yield f"data: {json.dumps({'token': '', 'done': True, 'sources': [], 'fragments_found': 0})}\n\n"
        return

    llm = _get_llm_stream()
    prompt = _build_prompt()
    chain = prompt | llm | StrOutputParser()

    try:
        # Streaming token a token via LangChain
        for token in chain.stream({"context": context, "question": question}):
            yield f"data: {json.dumps({'token': token, 'done': False})}\n\n"
    except Exception as e:
        logger.error(f"Error durante el streaming de Gemini: {e}")
        error_msg = "\n[Error del Sistema: Límite de peticiones excedido o error en la API de Google Gemini. Por favor intente de nuevo en unos momentos o comuníquese con el administrador.]"
        yield f"data: {json.dumps({'token': error_msg, 'done': False})}\n\n"

    # Evento final con metadatos (fuentes, cantidad de fragmentos)
    sources_data = [
        {"content": s.content, "file_name": s.file_name, "page": s.page}
        for s in sources
    ]
    fragments_count = len(relevant_docs) if relevant_docs is not None else 0
    yield f"data: {json.dumps({'token': '', 'done': True, 'sources': sources_data, 'fragments_found': fragments_count})}\n\n"
    logger.info(f"[STREAM] Completado. {fragments_count} fragmentos usados.")


def answer_question(question: str) -> ChatResponse:
    """
    Pipeline RAG completo: busca contexto relevante y genera una respuesta con Google Gemini.
    
    Args:
        question: Pregunta formulada por el usuario.
        
    Returns:
        ChatResponse con la respuesta generada y los documentos fuente.
    """
    logger.info(f"Nueva consulta RAG recibida: '{question[:80]}...'")

    rule_response = _check_control_rules(question)
    if rule_response is not None:
        return rule_response

    # Paso 1: Recuperar fragmentos relevantes de ChromaDB
    augmented_query = _augment_question(question, topic=None, keywords=None)
    relevant_docs: List[Document] = search_similar_documents(query=augmented_query, k=RETRIEVER_K)
    
    if not relevant_docs:
        logger.warning("No se encontraron fragmentos relevantes para la consulta.")
        return ChatResponse(
            answer="No se pudo encontrar una respuesta a su duda en los documentos oficiales. Por favor, comuníquese con el administrador del sistema.",
            sources=[],
            model_used=LLM_MODEL,
            fragments_found=0
        )
    
    # Paso 2: Construir el contexto combinando los fragmentos relevantes
    context_parts = []
    for i, doc in enumerate(relevant_docs, 1):
        file_name = doc.metadata.get("file_name", "Documento desconocido")
        context_parts.append(f"[Fuente {i} - {file_name}]:\n{doc.page_content}")
    
    context = "\n\n---\n\n".join(context_parts)
    
    # Paso 3: Generar la respuesta con Google Gemini
    logger.info(f"Generando respuesta con {LLM_MODEL} usando {len(relevant_docs)} fragmentos de contexto...")
    
    llm = _get_llm_sync()  # Usar LLM síncrono (sin streaming) para respuesta JSON completa
    prompt = _build_prompt()
    
    # Pipeline moderno LCEL (LangChain Expression Language)
    # Reemplaza al deprecado LLMChain: prompt | llm | parser
    chain = prompt | llm | StrOutputParser()
    
    answer_text = chain.invoke({
        "context": context,
        "question": question
    })
    
    # Paso 4: Construir los objetos fuente para la respuesta
    sources = [
        SourceDocument(
            content=doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content,
            file_name=doc.metadata.get("file_name"),
            page=doc.metadata.get("page")
        )
        for doc in relevant_docs
    ]
    
    logger.info(f"Respuesta generada exitosamente. Fragmentos utilizados: {len(relevant_docs)}")
    
    return ChatResponse(
        answer=answer_text.strip(),
        sources=sources,
        model_used=LLM_MODEL,
        fragments_found=len(relevant_docs)
    )


def process_uploaded_document(file_path: str, original_filename: str) -> DocumentUploadResponse:
    """
    Procesa y indexa un documento subido al sistema.
    
    Args:
        file_path: Ruta temporal del archivo guardado en el servidor.
        original_filename: Nombre original del archivo subido por el usuario.
        
    Returns:
        DocumentUploadResponse con el resultado de la operación.
    """
    logger.info(f"Procesando documento subido: {original_filename}")
    
    try:
        # Cargar y fragmentar el documento
        chunks = load_document(file_path)
        
        # Indexar los fragmentos en ChromaDB
        indexed_count = add_documents_to_store(chunks)
        
        # Limpiar el archivo temporal
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Archivo temporal eliminado: {file_path}")
        
        return DocumentUploadResponse(
            message=f"Documento '{original_filename}' procesado e indexado exitosamente.",
            file_name=original_filename,
            fragments_indexed=indexed_count,
            success=True
        )
        
    except Exception as e:
        logger.error(f"Error al procesar documento '{original_filename}': {e}")
        
        # Limpiar el archivo temporal en caso de error
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return DocumentUploadResponse(
            message=f"Error al procesar el documento: {str(e)}",
            file_name=original_filename,
            fragments_indexed=0,
            success=False
        )
