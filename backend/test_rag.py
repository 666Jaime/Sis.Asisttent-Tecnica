import os
import sys
from dotenv import load_dotenv
load_dotenv()

# Configurar path para poder importar app
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services.rag_service import answer_question
from app.rag.vector_store import get_collection_stats

def main():
    print("--- Probando estadísticas de ChromaDB ---")
    stats = get_collection_stats()
    print(f"Estadísticas obtenidas: {stats}")

    print("\n--- Realizando una pregunta de prueba al RAG con Gemini ---")
    pregunta = "¿Cuáles son las pautas del correo institucional?"
    print(f"Pregunta: {pregunta}")
    
    try:
        response = answer_question(pregunta)
        print("\n=== RESPUESTA OBTENIDA ===")
        print(response.answer)
        print("\n=== FUENTES ===")
        for s in response.sources:
            print(f"- Archivo: {s.file_name} | Página: {s.page}")
    except Exception as e:
        print(f"Error al obtener respuesta: {e}")

if __name__ == "__main__":
    main()
