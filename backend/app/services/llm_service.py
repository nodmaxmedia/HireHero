import os
from google import genai
from google.genai import types
from openai import OpenAI

class LLMService:
    def __init__(self):
        # 1. Configure Gemini (Primary)
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.gemini_client = None
        if self.gemini_key:
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_key)
                print("Gemini client initialised.")
            except Exception as e:
                print(f"Gemini Init Error: {e}")

        # 2. Configure Groq (Fallback)
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.groq_client = None
        if self.groq_key:
            try:
                self.groq_client = OpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=self.groq_key
                )
                print("Groq client initialised.")
            except Exception as e:
                print(f"Groq Init Error: {e}")

    def generate_text(self, system_prompt, user_prompt):
        """Generates text using Gemini (primary) or Groq (fallback)."""

        # --- Attempt 1: Gemini ---
        if self.gemini_client:
            try:
                response = self.gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.4,
                    )
                )
                return response.text
            except Exception as e:
                print(f"Gemini API Failed: {e}")
                if not self.groq_client:
                    raise e

        # --- Attempt 2: Groq (Fallback) ---
        if self.groq_client:
            print("Switching to Groq (Llama 3)...")
            try:
                response = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.4
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"Groq API Failed: {e}")
                raise e

        raise Exception("No LLM provider configured or available.")

llm_service = LLMService()
