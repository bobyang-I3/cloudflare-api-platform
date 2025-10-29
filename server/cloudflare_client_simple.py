"""
Cloudflare Workers AI API client - SIMPLIFIED VERSION
Only includes verified working models
"""
import httpx
import time
import tiktoken
from typing import List, Dict, Optional
from config import settings


# Verified working models - tested and confirmed available
AVAILABLE_MODELS = [
    # Text Generation - Core Models (Verified Working)
    {"id": "@cf/openai/gpt-oss-120b", "name": "GPT OSS 120B", "provider": "OpenAI", "task": "text-generation", "description": "OpenAI's open-weight model for powerful reasoning and agentic tasks", "capabilities": ["batch"], "status": "active"},
    {"id": "@cf/openai/gpt-oss-20b", "name": "GPT OSS 20B", "provider": "OpenAI", "task": "text-generation", "description": "Lower latency model for local or specialized use-cases", "capabilities": [], "status": "active"},
    {"id": "@cf/meta/llama-3.1-8b-instruct", "name": "Llama 3.1 8B Instruct", "provider": "Meta", "task": "text-generation", "description": "Fast and reliable, multilingual dialogue", "capabilities": [], "status": "active"},
    {"id": "@cf/meta/llama-3-8b-instruct", "name": "Llama 3 8B Instruct", "provider": "Meta", "task": "text-generation", "description": "Stable version, good for general use", "capabilities": [], "status": "active"},
    {"id": "@cf/meta/llama-2-7b-chat-fp16", "name": "Llama 2 7B Chat FP16", "provider": "Meta", "task": "text-generation", "description": "Stable, widely compatible", "capabilities": [], "status": "active"},
    {"id": "@cf/mistral/mistral-7b-instruct-v0.1", "name": "Mistral 7B Instruct", "provider": "MistralAI", "task": "text-generation", "description": "High quality, good for complex tasks", "capabilities": [], "status": "active"},
    
    # Automatic Speech Recognition
    {"id": "@cf/openai/whisper-large-v3-turbo", "name": "Whisper Large V3 Turbo", "provider": "OpenAI", "task": "automatic-speech-recognition", "description": "High-quality speech recognition and translation", "capabilities": [], "status": "active"},
    
    # Image-to-Text - Vision Models
    {"id": "@cf/unum/uform-gen2-qwen-500m", "name": "UForm-Gen2 Qwen 500M", "provider": "Unum", "task": "image-to-text", "description": "Small and fast model for image captioning and visual Q&A", "capabilities": ["vision"], "status": "beta"},
    
    # Text-to-Image - Verified Models
    {"id": "@cf/black-forest-labs/flux-1-schnell", "name": "FLUX.1 Schnell", "provider": "Black Forest Labs", "task": "text-to-image", "description": "12B parameter model, very fast image generation (4 steps)", "capabilities": [], "status": "active"},
]


def get_available_models():
    """Get list of available models"""
    return AVAILABLE_MODELS


def get_model_by_id(model_id: str) -> Optional[Dict]:
    """Get model configuration by ID"""
    for model in AVAILABLE_MODELS:
        if model["id"] == model_id:
            return model
    return None


def get_models_by_task(task: str) -> List[Dict]:
    """Get models filtered by task type"""
    return [m for m in AVAILABLE_MODELS if m["task"] == task]


def estimate_tokens(text: str) -> int:
    """
    Estimate token count for text
    Using tiktoken with cl100k_base encoding (similar to GPT-3.5/4)
    """
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except Exception:
        # Fallback: rough estimate of 1 token ≈ 4 characters
        return len(text) // 4


async def call_cloudflare_ai(
    messages: List[Dict[str, str]],
    model: str,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    stream: bool = False
) -> Dict:
    """
    Call Cloudflare Workers AI API for text generation or image generation
    Returns: {
        "response": str,
        "input_tokens": int,
        "output_tokens": int,
        "total_tokens": int,
        "response_time_ms": float
    }
    """
    start_time = time.time()
    
    # Verify model exists
    model_info = get_model_by_id(model)
    if not model_info:
        raise ValueError(f"Model '{model}' not found in available models. Please select from the available list.")
    
    # Build API URL
    # GPT OSS models use Responses API endpoint
    if "gpt-oss" in model:
        url = f"{settings.cloudflare_api_base}/accounts/{settings.cloudflare_account_id}/ai/v1/responses"
    else:
        url = f"{settings.cloudflare_api_base}/accounts/{settings.cloudflare_account_id}/ai/run/{model}"
    
    # Prepare request
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.cloudflare_api_key}"
    }
    
    # Handle GPT OSS models (Responses API)
    if "gpt-oss" in model:
        # GPT OSS uses Responses API format with 'input' instead of 'messages'
        # Extract the last user message as input
        input_text = ""
        for msg in reversed(messages):
            if msg["role"] == "user":
                input_text = msg["content"]
                break
        
        if not input_text:
            raise ValueError("Please provide a message for the model.")
        
        payload = {
            "model": model,
            "input": input_text
        }
        
        input_tokens = estimate_tokens(input_text)
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                if not response.is_success:
                    error_text = response.text
                    if response.status_code == 401:
                        raise Exception("Invalid API key or Account ID.")
                    elif response.status_code == 404:
                        raise Exception(f"Model '{model}' not found.")
                    elif response.status_code == 429:
                        raise Exception("Rate limit exceeded. Please wait and try again.")
                    else:
                        raise Exception(f"Cloudflare AI API error ({response.status_code}): {error_text}")
                
                data = response.json()
        except httpx.TimeoutException:
            raise Exception("Request timed out. Please try again.")
        except httpx.RequestError as e:
            raise Exception(f"Network error: {str(e)}")
        
        # Extract response from GPT OSS format
        # Response structure: output[{type: 'message', content: [{type: 'output_text', text: '...'}]}]
        response_text = ""
        output_array = data.get("output", [])
        
        # Find the message output
        for item in output_array:
            if item.get("type") == "message":
                content_array = item.get("content", [])
                for content_item in content_array:
                    if content_item.get("type") == "output_text":
                        response_text = content_item.get("text", "")
                        break
                if response_text:
                    break
        
        if not response_text:
            raise Exception(f"Model returned empty response. API response structure: {data}")
        
        # Extract token usage from API response
        usage = data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", input_tokens)
        output_tokens = usage.get("completion_tokens", estimate_tokens(response_text))
        total_tokens = usage.get("total_tokens", input_tokens + output_tokens)
        response_time_ms = (time.time() - start_time) * 1000
        
        return {
            "response": response_text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "response_time_ms": response_time_ms
        }
    
    # Handle text-to-image models
    elif model_info["task"] == "text-to-image":
        # For image generation, extract prompt from the last message
        prompt = messages[-1]["content"] if messages else ""
        if not prompt:
            raise ValueError("Please provide a prompt for image generation.")
        
        payload = {
            "prompt": prompt,
            "num_steps": 4  # Default for FLUX.1-schnell
        }
        
        input_tokens = estimate_tokens(prompt)
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:  # Longer timeout for image generation
                response = await client.post(url, json=payload, headers=headers)
                
                if not response.is_success:
                    error_text = response.text
                    if response.status_code == 401:
                        raise Exception("Invalid API key or Account ID.")
                    elif response.status_code == 404:
                        raise Exception(f"Model '{model}' not found.")
                    elif response.status_code == 429:
                        raise Exception("Rate limit exceeded. Please wait and try again.")
                    else:
                        raise Exception(f"Image generation failed ({response.status_code}): {error_text}")
                
                data = response.json()
        except httpx.TimeoutException:
            raise Exception("Image generation timed out. Please try again.")
        except httpx.RequestError as e:
            raise Exception(f"Network error: {str(e)}")
        
        # Extract base64 image
        image_base64 = data.get("result", {}).get("image", "")
        if not image_base64:
            raise Exception("Model returned no image data.")
        
        # Return image as data URI
        response_text = f"data:image/png;base64,{image_base64}"
        output_tokens = 0  # Images don't have tokens
        
        response_time_ms = (time.time() - start_time) * 1000
        
        return {
            "response": response_text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens,
            "response_time_ms": response_time_ms
        }
    
    # Handle automatic-speech-recognition models (Whisper)
    if model_info["task"] == "automatic-speech-recognition":
        # Extract audio data from messages
        audio_data = messages[-1].get("audio") if messages else None
        
        if not audio_data:
            raise ValueError("Please provide an audio file for speech recognition.")
        
        # Remove data URI prefix if present (e.g., "data:audio/wav;base64,...")
        if isinstance(audio_data, str) and audio_data.startswith("data:audio"):
            audio_data = audio_data.split(",")[1]
        
        # Convert base64 to byte array
        import base64
        try:
            audio_bytes = base64.b64decode(audio_data)
            audio_array = list(audio_bytes)  # Convert bytes to list of integers
        except Exception as e:
            raise ValueError(f"Failed to decode audio data: {str(e)}")
        
        payload = {
            "audio": audio_array  # Array of integers (audio bytes)
        }
        
        input_tokens = len(audio_array) // 1000  # Rough estimate: 1 token per KB
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                if not response.is_success:
                    error_text = response.text
                    if response.status_code == 401:
                        raise Exception("Invalid API key or Account ID.")
                    elif response.status_code == 404:
                        raise Exception(f"Model '{model}' not found.")
                    elif response.status_code == 429:
                        raise Exception("Rate limit exceeded. Please wait and try again.")
                    else:
                        raise Exception(f"Audio transcription failed ({response.status_code}): {error_text}")
                
                data = response.json()
        except httpx.TimeoutException:
            raise Exception("Audio transcription timed out. Please try again.")
        except httpx.RequestError as e:
            raise Exception(f"Network error: {str(e)}")
        
        # Extract transcription text
        response_text = data.get("result", {}).get("text", "")
        if not response_text:
            raise Exception("Model returned no transcription.")
        
        output_tokens = estimate_tokens(response_text)
        response_time_ms = (time.time() - start_time) * 1000
        
        return {
            "response": response_text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "response_time_ms": response_time_ms
        }
    
    # Handle image-to-text models (vision models)
    if model_info["task"] == "image-to-text":
        # Extract prompt and image from messages
        prompt = messages[-1]["content"] if messages else ""
        image_data = messages[-1].get("image") if messages else None
        
        if not prompt:
            prompt = "Describe this image in detail."
        if not image_data:
            raise ValueError("Please provide an image for vision models.")
        
        # Remove data URI prefix if present
        if isinstance(image_data, str) and image_data.startswith("data:image"):
            image_data = image_data.split(",")[1]
        
        # Convert base64 to byte array (Cloudflare expects array format)
        import base64
        try:
            image_bytes = base64.b64decode(image_data)
            image_array = list(image_bytes)  # Convert bytes to list of integers
        except Exception as e:
            raise ValueError(f"Failed to decode image data: {str(e)}")
        
        payload = {
            "image": image_array,  # Array of integers (0-255)
            "prompt": prompt,
            "max_tokens": max_tokens
        }
        
        input_tokens = estimate_tokens(prompt)
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                if not response.is_success:
                    error_text = response.text
                    if response.status_code == 401:
                        raise Exception("Invalid API key or Account ID.")
                    elif response.status_code == 404:
                        raise Exception(f"Model '{model}' not found.")
                    elif response.status_code == 429:
                        raise Exception("Rate limit exceeded. Please wait and try again.")
                    else:
                        raise Exception(f"Vision analysis failed ({response.status_code}): {error_text}")
                
                data = response.json()
        except httpx.TimeoutException:
            raise Exception("Vision analysis timed out. Please try again.")
        except httpx.RequestError as e:
            raise Exception(f"Network error: {str(e)}")
        
        # Extract response
        response_text = data.get("result", {}).get("description", "")
        if not response_text:
            raise Exception("Model returned no description.")
        
        output_tokens = estimate_tokens(response_text)
        response_time_ms = (time.time() - start_time) * 1000
        
        return {
            "response": response_text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "response_time_ms": response_time_ms
        }
    
    # Text generation models
    payload = {
        "messages": messages,
        "stream": False,
    }
    
    # Only add optional parameters if model supports them
    if model_info["task"] == "text-generation":
        payload["temperature"] = temperature
        payload["max_tokens"] = max_tokens
    
    # Calculate input tokens
    input_text = " ".join([msg.get("content", "") for msg in messages])
    input_tokens = estimate_tokens(input_text)
    
    # Make request with error handling
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if not response.is_success:
                error_text = response.text
                # Provide helpful error message
                if response.status_code == 401:
                    raise Exception("Invalid API key or Account ID. Please check your Cloudflare credentials.")
                elif response.status_code == 404:
                    raise Exception(f"Model '{model}' not found. It may have been deprecated or requires special access.")
                elif response.status_code == 429:
                    raise Exception("Rate limit exceeded. Please wait a moment and try again.")
                else:
                    raise Exception(f"Cloudflare AI API error ({response.status_code}): {error_text}")
            
            data = response.json()
    except httpx.TimeoutException:
        raise Exception("Request timed out. The model may be overloaded. Please try again.")
    except httpx.RequestError as e:
        raise Exception(f"Network error: {str(e)}")
    
    # Extract response
    response_text = (
        data.get("result", {}).get("response") or
        data.get("result", {}).get("output_text") or
        data.get("result", {}).get("generated_text") or
        ""
    )
    
    if not response_text:
        raise Exception("Model returned empty response. Please try a different model or rephrase your prompt.")
    
    # Calculate output tokens
    output_tokens = estimate_tokens(response_text)
    total_tokens = input_tokens + output_tokens
    
    # Calculate response time
    response_time_ms = (time.time() - start_time) * 1000
    
    return {
        "response": response_text,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "response_time_ms": response_time_ms
    }

