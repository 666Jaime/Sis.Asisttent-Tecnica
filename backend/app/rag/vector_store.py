"""
vector_store.py
Módulo de gestión de la base de datos vectorial ChromaDB para FiscalIA Assistant.

ChromaDB almacena los embeddings de los documentos de la Fiscalía de forma
persistente en disco, permitiendo búsquedas semánticas ultrarrápidas sin
necesidad de reprocesar documentos en cada reinicio del servidor.
"""
import logging
from typing import List, Optional

import chromadb
from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.rag.embeddings import get_embeddings

logger = logging.getLogger("fiscalia_assistant")

# Ruta donde ChromaDB guardará su base de datos en disco.
CHROMA_PERSIST_DIR = "chroma_db"

# Nombre de la colección donde se guardarán los documentos de la Fiscalía.
COLLECTION_NAME = "fiscalia_documentos"


def get_vector_store() -> Chroma:
    """
    Devuelve una instancia de ChromaDB conectada a la colección persistente.
    
    Si la colección no existe, la crea automáticamente.
    Si ya existe, la carga desde disco sin reprocesar documentos.
    """
    embeddings = get_embeddings()
    
    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR
    )
    
    return vector_store


def add_documents_to_store(documents: List[Document]) -> int:
    """
    Indexa una lista de fragmentos de documentos en ChromaDB.
    
    Args:
        documents: Lista de Document con texto y metadatos a indexar.
        
    Returns:
        Número de fragmentos indexados exitosamente.
    """
    logger.info(f"Indexando {len(documents)} fragmentos en ChromaDB...")
    
    vector_store = get_vector_store()
    vector_store.add_documents(documents)
    
    logger.info(f"Indexación completada: {len(documents)} fragmentos almacenados.")
    return len(documents)


def search_similar_documents(
    query: str,
    k: int = 2,
    score_threshold: float = 0.3
) -> List[Document]:
    """
    Busca los fragmentos más similares semánticamente a una consulta.
    
    Args:
        query: Texto de la pregunta o consulta del usuario.
        k: Número máximo de fragmentos a recuperar (por defecto 2).
        score_threshold: Umbral mínimo de similitud para incluir un resultado.
        
    Returns:
        Lista de Document con los fragmentos más relevantes encontrados.
    """
    vector_store = get_vector_store()
    
    results = vector_store.similarity_search_with_relevance_scores(
        query=query,
        k=k
    )
    
    # Filtrar resultados por umbral de similitud mínima
    filtered = [
        doc for doc, score in results
        if score >= score_threshold
    ]
    
    logger.info(
        f"Búsqueda semántica: {len(filtered)} fragmentos relevantes "
        f"encontrados de {len(results)} candidatos."
    )
    
    return filtered


def get_collection_stats() -> dict:
    """
    Devuelve estadísticas de la base de conocimiento, integrando los contadores
    de documentos, tutoriales y categorías de Supabase con los fragmentos de ChromaDB.
    """
    # Inicializar contadores por defecto
    documents_count = 0
    tutorials_count = 0
    categories_count = 0
    total_fragments = 0
    status_db = "connected"

    # 1. Obtener total de fragmentos de ChromaDB
    try:
        client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        collection = client.get_or_create_collection(COLLECTION_NAME)
        total_fragments = collection.count()
    except Exception as e:
        logger.error(f"Error al obtener estadísticas de ChromaDB: {e}")
        status_db = "chromadb_error"

    # 2. Obtener estadísticas de Supabase
    try:
        from app.core import supabase
        
        if supabase is not None:
            # Consultar conteo de categorías
            cat_res = supabase.table("categorias").select("id").execute()
            categories_count = len(cat_res.data) if cat_res.data else 0

            # Consultar conteo de documentos
            doc_res = supabase.table("documentos").select("id").execute()
            documents_count = len(doc_res.data) if doc_res.data else 0

            # Consultar conteo de tutoriales
            tut_res = supabase.table("tutoriales").select("id").execute()
            tutorials_count = len(tut_res.data) if tut_res.data else 0
        else:
            status_db = "supabase_error"

    except Exception as e:
        logger.error(f"Error al obtener estadísticas de Supabase: {e}")
        if status_db == "connected":
            status_db = "supabase_error"
        else:
            status_db = "error"

    return {
        "documents": documents_count,
        "tutorials": tutorials_count,
        "categories": categories_count,
        "total_fragments": total_fragments,
        "collection_name": COLLECTION_NAME,
        "status": status_db
    }

