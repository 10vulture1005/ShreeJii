import os
from groq import Groq

def generate_product_description(name: str, clothing_type: str, color: str, image_data_url: str = None) -> str:
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
        
        if image_data_url:
            vision_prompt = prompt + " Please incorporate visual details from the provided image into the description to make it more accurate."
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": vision_prompt},
                        {"type": "image_url", "image_url": {"url": image_data_url}}
                    ]
                }
            ]
            
            try:
                # Try the latest 17B Scout multimodal model
                completion = client.chat.completions.create(
                    model="meta-llama/llama-4-scout-17b-16e-instruct",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=150,
                    top_p=1,
                    stream=False,
                    stop=None,
                )
                return completion.choices[0].message.content.strip()
            except Exception as vision_e:
                print(f"Vision model failed ({vision_e}), falling back to text-only...")

        # Text-only fallback (or if no image is provided)
        fallback_messages = [
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=fallback_messages,
            temperature=0.7,
            max_tokens=150,
            top_p=1,
            stream=False,
            stop=None,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating description with Groq: {e}")
        return ""
