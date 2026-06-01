import os
from dotenv import load_dotenv
load_dotenv()

from google import genai

api_key = os.getenv("GOOGLE_API_KEY")
print(f"Testing with API Key: {api_key[:20]}..." if api_key else "No API Key found")
client = genai.Client(api_key=api_key)

# Modelos disponibles en Google Gemini API v1
models_to_test = [
    "gemini-1.5-flash",
    "gemini-1.5-pro", 
    "gemini-pro",
]

print("\n=== Testing Available Models ===\n")
for model in models_to_test:
    try:
        print(f"Testing model: {model}...")
        response = client.models.generate_content(
            model=model,
            contents="Hola, di 'test' en una palabra."
        )
        print(f"✓ SUCCESS for {model}: {response.text}\n")
    except Exception as e:
        print(f"✗ FAILED for {model}: {e}\n")
