"""
embeddings.py
Configuración del modelo de embeddings local para FiscalIA Assistant.

Utiliza sentence-transformers para generar vectores semánticos de texto
de forma completamente local, sin depender de APIs externas de pago.
"""
from langchain_huggingface import HuggingFaceEmbeddings

# Modelo multilingüe optimizado para español y documentos técnicos/legales.
# Peso: ~90 MB. Se descarga automáticamente en el primer uso.
EMBEDDING_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def get_embeddings():
    """
    Devuelve una instancia del modelo de embeddings local.

    El modelo 'paraphrase-multilingual-MiniLM-L12-v2' es ideal para FiscalIA
    porque fue entrenado en más de 50 idiomas incluyendo español, y comprende
    el lenguaje formal y técnico utilizado en documentos jurídicos.
    """
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": "cpu"},  # Usar CPU para compatibilidad universal
        encode_kwargs={"normalize_embeddings": True}  # Normalizar para mejor similitud coseno
    )
