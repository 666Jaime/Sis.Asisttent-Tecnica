import os
from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types

api_key = os.getenv("GOOGLE_API_KEY")
print(f"API Key starting with: {api_key[:10] if api_key else 'None'}")

try:
    client = genai.Client(api_key=api_key)
    print("Listing models...")
    for model in client.models.list():
        print(f"Model Name: {model.name}")
except Exception as e:
    print(f"Error listing models: {e}")
