"""
document_loader.py
Módulo de carga y fragmentación de documentos para FiscalIA Assistant.

Soporta los formatos más comunes en la Fiscalía Departamental de Tarija:
- PDF: Resoluciones, expedientes, circulares, normativas.
- DOCX: Informes, dictámenes, memorándums.
"""
import logging
from pathlib import Path
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_core.documents import Document

logger = logging.getLogger("fiscalia_assistant")

# Configuración de la estrategia de chunking para documentos jurídicos.
# chunk_size: Fragmentos de 1000 caracteres para capturar párrafos completos.
# chunk_overlap: Superposición de 200 caracteres para no perder contexto entre fragmentos.
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


def load_document(file_path: str) -> List[Document]:
    """
    Carga un documento desde disco y lo fragmenta en chunks semánticos.
    
    Args:
        file_path: Ruta absoluta al archivo PDF o DOCX.
        
    Returns:
        Lista de objetos Document con el texto fragmentado y sus metadatos.
    
    Raises:
        ValueError: Si el formato de archivo no es soportado.
        FileNotFoundError: Si el archivo no existe.
    """
    path = Path(file_path)
    
    if not path.exists():
        raise FileNotFoundError(f"Archivo no encontrado: {file_path}")
    
    extension = path.suffix.lower()
    logger.info(f"Cargando documento: {path.name} (formato: {extension})")
    
    # Seleccionar el loader adecuado según el tipo de archivo
    if extension == ".pdf":
        loader = PyPDFLoader(file_path)
    elif extension in [".docx", ".doc"]:
        loader = Docx2txtLoader(file_path)
    else:
        raise ValueError(
            f"Formato de archivo '{extension}' no soportado. "
            f"Formatos válidos: .pdf, .docx"
        )
    
    # Cargar el documento
    documents = loader.load()
    
    # Agregar metadatos del archivo a cada fragmento
    for doc in documents:
        doc.metadata["file_name"] = path.name
        doc.metadata["file_type"] = extension
    
    # Fragmentar con RecursiveCharacterTextSplitter
    # Este splitter respeta párrafos, oraciones y palabras, en ese orden de prioridad.
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    chunks = splitter.split_documents(documents)
    logger.info(f"Documento '{path.name}' procesado en {len(chunks)} fragmentos.")
    
    return chunks
