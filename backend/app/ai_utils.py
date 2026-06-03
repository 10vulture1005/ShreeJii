import os
from groq import Groq

def generate_product_description(name: str, clothing_type: str, color: str) -> str:
    """
    Generates a short e-commerce product description using Groq.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return ""
        
    try:
        client = Groq(api_key=api_key)
        
        prompt = (
            f"Write a very short, elegant e-commerce product description for a {clothing_type} in {color} "
            f"named '{name}'. The description should be engaging, highlight its elegance, and be exactly 2 sentences long. "
            f"Do not include any greeting or conversational filler."
        )
        
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=100,
            top_p=1,
            stream=False,
            stop=None,
        )
        
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating description with Groq: {e}")
        return ""
