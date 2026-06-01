#!/usr/bin/env python3
"""
test_api_setup.py - Script de verificación de configuración de Google Gemini API

Este script verifica que:
1. La API Key esté correctamente configurada
2. El modelo seleccionado esté disponible y funcione
3. El sistema RAG pueda conectarse a Gemini
"""
import os
import sys
from dotenv import load_dotenv

print("=" * 70)
print("FiscalIA Assistant — Verificador de Configuración de Gemini API")
print("=" * 70)

# Cargar variables de entorno
load_dotenv()

# 1. Verificar API Key
print("\n[1] Verificando API Key...")
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("❌ ERROR: GOOGLE_API_KEY no encontrada en .env")
    sys.exit(1)
print(f"✓ API Key detectada: {api_key[:20]}...{api_key[-10:]}")

# 2. Verificar modelo configurado
print("\n[2] Verificando modelo configurado...")
llm_model = os.getenv("LLM_MODEL", "gemini-1.5-flash")
print(f"✓ Modelo configurado: {llm_model}")

# 3. Intentar conectar con Google Gemini
print("\n[3] Intentando conectar con Google Gemini API...")
try:
    from google import genai
    client = genai.Client(api_key=api_key)
    print("✓ Cliente de Google Gemini inicializado correctamente")
except Exception as e:
    print(f"❌ ERROR al inicializar cliente Gemini: {e}")
    sys.exit(1)

# 4. Listar modelos disponibles
print("\n[4] Modelos disponibles en tu cuenta...")
try:
    models = client.models.list()
    available_models = []
    for model in models:
        model_name = model.name.replace("models/", "")
        available_models.append(model_name)
    
    for m in available_models:
        status = "✓" if m == llm_model else " "
        print(f"  {status} {m}")
    
    if llm_model not in available_models:
        print(f"\n⚠️  ADVERTENCIA: El modelo '{llm_model}' no está disponible")
        print(f"Modelos recomendados: {', '.join(available_models[:3])}")
except Exception as e:
    print(f"❌ ERROR al listar modelos: {e}")
    sys.exit(1)

# 5. Probar generación de contenido
print(f"\n[5] Probando generación de contenido con {llm_model}...")
try:
    response = client.models.generate_content(
        model=llm_model,
        contents="Responde con una palabra: 'funcionando'"
    )
    print(f"✓ Respuesta del modelo: {response.text}")
except Exception as e:
    print(f"❌ ERROR en generación de contenido: {e}")
    sys.exit(1)

# 6. Probar con LangChain
print("\n[6] Verificando integración con LangChain...")
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    llm = ChatGoogleGenerativeAI(
        model=llm_model,
        google_api_key=api_key,
        api_version="v1",
        temperature=0.3
    )
    result = llm.invoke("Di una palabra: test")
    print(f"✓ LangChain funcionando correctamente")
    print(f"  Respuesta: {result.content}")
except Exception as e:
    print(f"❌ ERROR en LangChain: {e}")
    sys.exit(1)

print("\n" + "=" * 70)
print("✓ CONFIGURACIÓN VERIFICADA — El sistema está listo para funcionar")
print("=" * 70)
