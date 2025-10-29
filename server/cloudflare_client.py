"""
Cloudflare Workers AI API client with comprehensive model support
"""
import httpx
import time
import tiktoken
from typing import List, Dict, AsyncGenerator, Optional
from config import settings


# Available Cloudflare AI models - Comprehensive list organized by task type
# Last updated: 2025-10-28
AVAILABLE_MODELS = [
    # ============= Text Generation Models =============
    {
        "id": "@cf/openai/gpt-oss-120b",
        "name": "GPT OSS 120B",
        "provider": "OpenAI",
        "task": "text-generation",
        "description": "OpenAI's open-weight models for powerful reasoning, agentic tasks, and versatile use cases",
        "capabilities": ["batch"],
        "status": "active"
    },
    {
        "id": "@cf/openai/gpt-oss-20b",
        "name": "GPT OSS 20B",
        "provider": "OpenAI",
        "task": "text-generation",
        "description": "Lower latency model for local or specialized use-cases",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/meta/llama-4-scout-17b-16e-instruct",
        "name": "Llama 4 Scout 17B",
        "provider": "Meta",
        "task": "text-generation",
        "description": "17B parameter model with 16 experts, natively multimodal with mixture-of-experts architecture",
        "capabilities": ["batch", "function-calling", "vision"],
        "status": "active"
    },
    {
        "id": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        "name": "Llama 3.3 70B Instruct FP8",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Llama 3.3 70B quantized to fp8 precision, optimized for speed",
        "capabilities": ["batch", "function-calling"],
        "status": "active"
    },
    {
        "id": "@cf/meta/llama-3.1-8b-instruct-fast",
        "name": "Llama 3.1 8B Instruct (Fast)",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Fast version optimized for multilingual dialogue and common industry benchmarks",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/meta/llama-3.1-8b-instruct",
        "name": "Llama 3.1 8B Instruct",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Multilingual large language model optimized for dialogue use cases",
        "capabilities": [],
        "status": "verified"
    },
    {
        "id": "@cf/meta/llama-3.2-1b-instruct",
        "name": "Llama 3.2 1B Instruct",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Lightweight model optimized for multilingual dialogue, agentic retrieval and summarization",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/meta/llama-3.2-3b-instruct",
        "name": "Llama 3.2 3B Instruct",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Optimized for multilingual dialogue, agentic retrieval and summarization tasks",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/meta/llama-3.2-11b-vision-instruct",
        "name": "Llama 3.2 11B Vision",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Vision-capable model for image reasoning, captioning, and visual question answering",
        "capabilities": ["vision", "lora"],
        "status": "active"
    },
    {
        "id": "@cf/meta/llama-3-8b-instruct",
        "name": "Llama 3 8B Instruct",
        "provider": "Meta",
        "task": "text-generation",
        "description": "State-of-the-art performance with improved reasoning capabilities",
        "capabilities": [],
        "status": "verified"
    },
    {
        "id": "@cf/meta/llama-3-8b-instruct-awq",
        "name": "Llama 3 8B Instruct (AWQ)",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Quantized (int4) version for efficient inference",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/meta/llama-2-7b-chat-int8",
        "name": "Llama 2 7B Chat",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Quantized chat model optimized for dialogue",
        "capabilities": [],
        "status": "verified"
    },
    {
        "id": "@cf/meta/llama-2-7b-chat-fp16",
        "name": "Llama 2 7B Chat FP16",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Full precision generative text model",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/meta/llama-guard-3-8b",
        "name": "Llama Guard 3 8B",
        "provider": "Meta",
        "task": "text-generation",
        "description": "Content safety classification for LLM inputs and responses",
        "capabilities": ["lora"],
        "status": "active"
    },
    {
        "id": "@cf/mistral/mistral-small-3.1-24b-instruct",
        "name": "Mistral Small 3.1 24B",
        "provider": "Mistral AI",
        "task": "text-generation",
        "description": "State-of-the-art vision understanding with 128k token context",
        "capabilities": ["function-calling", "vision"],
        "status": "active"
    },
    {
        "id": "@cf/mistral/mistral-7b-instruct-v0.2",
        "name": "Mistral 7B Instruct v0.2",
        "provider": "Mistral AI",
        "task": "text-generation",
        "description": "32k context window with rope-theta optimization",
        "capabilities": ["lora"],
        "status": "beta"
    },
    {
        "id": "@cf/mistral/mistral-7b-instruct-v0.1",
        "name": "Mistral 7B Instruct v0.1",
        "provider": "Mistral AI",
        "task": "text-generation",
        "description": "Instruct fine-tuned generative text model",
        "capabilities": ["lora"],
        "status": "active"
    },
    {
        "id": "@cf/qwen/qwq-32b",
        "name": "QwQ 32B",
        "provider": "Qwen",
        "task": "text-generation",
        "description": "Reasoning model capable of thinking and achieving enhanced performance",
        "capabilities": ["lora"],
        "status": "active"
    },
    {
        "id": "@cf/qwen/qwen2.5-coder-32b-instruct",
        "name": "Qwen2.5 Coder 32B",
        "provider": "Qwen",
        "task": "text-generation",
        "description": "Code-specific LLM for development tasks",
        "capabilities": ["lora"],
        "status": "active"
    },
    {
        "id": "@cf/qwen/qwen1.5-7b-chat-awq",
        "name": "Qwen 1.5 7B Chat AWQ",
        "provider": "Qwen",
        "task": "text-generation",
        "description": "Efficient quantized version of Qwen",
        "capabilities": [],
        "status": "deprecated"
    },
    {
        "id": "@cf/google/gemma-3-12b-it",
        "name": "Gemma 3 12B IT",
        "provider": "Google",
        "task": "text-generation",
        "description": "Multimodal model with 128K context, multilingual support in 140+ languages",
        "capabilities": ["lora", "vision"],
        "status": "active"
    },
    {
        "id": "@cf/google/gemma-7b-it",
        "name": "Gemma 7B IT",
        "provider": "Google",
        "task": "text-generation",
        "description": "Lightweight open model from Google Gemini research",
        "capabilities": ["lora"],
        "status": "beta"
    },
    {
        "id": "@cf/ibm/granite-4.0-h-micro",
        "name": "Granite 4.0 Micro",
        "provider": "IBM",
        "task": "text-generation",
        "description": "Industry-leading agentic tasks like function calling and instruction following",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
        "name": "DeepSeek R1 Distill Qwen 32B",
        "provider": "DeepSeek",
        "task": "text-generation",
        "description": "Distilled model achieving state-of-the-art results for dense models",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/deepseek-ai/deepseek-math-7b-instruct",
        "name": "DeepSeek Math 7B",
        "provider": "DeepSeek",
        "task": "text-generation",
        "description": "Mathematically instructed tuning model",
        "capabilities": [],
        "status": "beta"
    },
    {
        "id": "@cf/nousresearch/hermes-2-pro-mistral-7b",
        "name": "Hermes 2 Pro Mistral 7B",
        "provider": "Nous Research",
        "task": "text-generation",
        "description": "Upgraded version with function calling and JSON mode",
        "capabilities": ["function-calling"],
        "status": "beta"
    },
    {
        "id": "@cf/microsoft/phi-2",
        "name": "Phi-2",
        "provider": "Microsoft",
        "task": "text-generation",
        "description": "Transformer model trained on NLP and coding datasets",
        "capabilities": [],
        "status": "beta"
    },
    {
        "id": "@cf/aisingapore/gemma-sea-lion-v4-27b-it",
        "name": "SEA-LION v4 27B",
        "provider": "AI Singapore",
        "task": "text-generation",
        "description": "Southeast Asian languages optimized model",
        "capabilities": [],
        "status": "active"
    },
    
    # ============= Text-to-Speech Models =============
    {
        "id": "@cf/deepgram/aura-2-es",
        "name": "Aura 2 Spanish",
        "provider": "Deepgram",
        "task": "text-to-speech",
        "description": "Context-aware Spanish TTS with natural pacing and expressiveness",
        "capabilities": ["batch", "partner", "real-time"],
        "status": "active"
    },
    {
        "id": "@cf/deepgram/aura-2-en",
        "name": "Aura 2 English",
        "provider": "Deepgram",
        "task": "text-to-speech",
        "description": "Context-aware English TTS with natural pacing and expressiveness",
        "capabilities": ["batch", "partner", "real-time"],
        "status": "active"
    },
    {
        "id": "@cf/deepgram/aura-1",
        "name": "Aura 1",
        "provider": "Deepgram",
        "task": "text-to-speech",
        "description": "Context-aware text-to-speech model",
        "capabilities": ["batch", "partner", "real-time"],
        "status": "active"
    },
    {
        "id": "@cf/myshell-ai/melotts",
        "name": "MeloTTS",
        "provider": "MyShell.ai",
        "task": "text-to-speech",
        "description": "High-quality multi-lingual text-to-speech",
        "capabilities": [],
        "status": "active"
    },
    
    # ============= Speech-to-Text Models =============
    {
        "id": "@cf/deepgram/nova-3",
        "name": "Nova 3",
        "provider": "Deepgram",
        "task": "automatic-speech-recognition",
        "description": "Advanced speech-to-text transcription model",
        "capabilities": ["batch", "partner", "real-time"],
        "status": "active"
    },
    {
        "id": "@cf/deepgram/flux",
        "name": "Flux",
        "provider": "Deepgram",
        "task": "automatic-speech-recognition",
        "description": "First conversational speech recognition model for voice agents",
        "capabilities": ["partner", "real-time"],
        "status": "active"
    },
    {
        "id": "@cf/openai/whisper",
        "name": "Whisper",
        "provider": "OpenAI",
        "task": "automatic-speech-recognition",
        "description": "General-purpose speech recognition with multilingual support",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/openai/whisper-large-v3-turbo",
        "name": "Whisper Large v3 Turbo",
        "provider": "OpenAI",
        "task": "automatic-speech-recognition",
        "description": "High-quality speech recognition and translation",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/openai/whisper-tiny-en",
        "name": "Whisper Tiny EN",
        "provider": "OpenAI",
        "task": "automatic-speech-recognition",
        "description": "English-only lightweight speech recognition",
        "capabilities": [],
        "status": "beta"
    },
    
    # ============= Text-to-Image Models =============
    {
        "id": "@cf/leonardo-ai/lucid-origin",
        "name": "Lucid Origin",
        "provider": "Leonardo.AI",
        "task": "text-to-image",
        "description": "Most adaptable and prompt-responsive model for varied visual styles",
        "capabilities": ["partner"],
        "status": "active"
    },
    {
        "id": "@cf/leonardo-ai/phoenix-1.0",
        "name": "Phoenix 1.0",
        "provider": "Leonardo.AI",
        "task": "text-to-image",
        "description": "Exceptional prompt adherence and coherent text generation",
        "capabilities": ["partner"],
        "status": "active"
    },
    {
        "id": "@cf/black-forest-labs/flux-1-schnell",
        "name": "FLUX.1 Schnell",
        "provider": "Black Forest Labs",
        "task": "text-to-image",
        "description": "12B parameter rectified flow transformer for image generation",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        "name": "Stable Diffusion XL Base",
        "provider": "Stability.ai",
        "task": "text-to-image",
        "description": "Diffusion-based text-to-image generative model",
        "capabilities": [],
        "status": "beta"
    },
    {
        "id": "@cf/bytedance/stable-diffusion-xl-lightning",
        "name": "SDXL Lightning",
        "provider": "ByteDance",
        "task": "text-to-image",
        "description": "Lightning-fast high-quality 1024px image generation",
        "capabilities": [],
        "status": "beta"
    },
    {
        "id": "@cf/lykon/dreamshaper-8-lcm",
        "name": "Dreamshaper 8 LCM",
        "provider": "Lykon",
        "task": "text-to-image",
        "description": "Stable Diffusion fine-tuned for photorealism",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/runwayml/stable-diffusion-v1-5-img2img",
        "name": "Stable Diffusion v1.5 Img2Img",
        "provider": "RunwayML",
        "task": "text-to-image",
        "description": "Generate new image from input image",
        "capabilities": [],
        "status": "beta"
    },
    {
        "id": "@cf/runwayml/stable-diffusion-v1-5-inpainting",
        "name": "Stable Diffusion v1.5 Inpainting",
        "provider": "RunwayML",
        "task": "text-to-image",
        "description": "Inpainting capability with mask support",
        "capabilities": [],
        "status": "beta"
    },
    
    # ============= Text Embeddings Models =============
    {
        "id": "@cf/baai/bge-large-en-v1.5",
        "name": "BGE Large EN v1.5",
        "provider": "BAAI",
        "task": "text-embeddings",
        "description": "1024-dimensional vector embeddings",
        "capabilities": ["batch"],
        "status": "active"
    },
    {
        "id": "@cf/baai/bge-base-en-v1.5",
        "name": "BGE Base EN v1.5",
        "provider": "BAAI",
        "task": "text-embeddings",
        "description": "768-dimensional vector embeddings",
        "capabilities": ["batch"],
        "status": "active"
    },
    {
        "id": "@cf/baai/bge-small-en-v1.5",
        "name": "BGE Small EN v1.5",
        "provider": "BAAI",
        "task": "text-embeddings",
        "description": "384-dimensional vector embeddings",
        "capabilities": ["batch"],
        "status": "active"
    },
    {
        "id": "@cf/baai/bge-m3",
        "name": "BGE M3",
        "provider": "BAAI",
        "task": "text-embeddings",
        "description": "Multi-functionality, multi-linguality, multi-granularity embeddings",
        "capabilities": ["batch"],
        "status": "active"
    },
    {
        "id": "@cf/google/embeddinggemma-300m",
        "name": "EmbeddingGemma 300M",
        "provider": "Google",
        "task": "text-embeddings",
        "description": "State-of-the-art embedding model trained on 100+ languages",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/pfnet/plamo-embedding-1b",
        "name": "PLaMo Embedding 1B",
        "provider": "Preferred Networks",
        "task": "text-embeddings",
        "description": "Japanese text embedding model",
        "capabilities": [],
        "status": "active"
    },
    
    # ============= Image-to-Text Models =============
    {
        "id": "@cf/llava-hf/llava-1.5-7b-hf",
        "name": "LLaVA 1.5 7B",
        "provider": "LLaVA",
        "task": "image-to-text",
        "description": "Multimodal instruction-following chatbot",
        "capabilities": [],
        "status": "beta"
    },
    {
        "id": "@cf/unum/uform-gen2-qwen-500m",
        "name": "UForm Gen2 Qwen 500M",
        "provider": "Unum",
        "task": "image-to-text",
        "description": "Small generative vision-language model for captioning and VQA",
        "capabilities": [],
        "status": "beta"
    },
    
    # ============= Translation Models =============
    {
        "id": "@cf/ai4bharat/indictrans2-en-indic-1B",
        "name": "IndicTrans2 EN-Indic",
        "provider": "AI4Bharat",
        "task": "translation",
        "description": "Multilingual translation across 22 Indic languages",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/meta/m2m100-1.2b",
        "name": "M2M100 1.2B",
        "provider": "Meta",
        "task": "translation",
        "description": "Many-to-many multilingual translation",
        "capabilities": ["batch"],
        "status": "active"
    },
    
    # ============= Classification Models =============
    {
        "id": "@cf/baai/bge-reranker-base",
        "name": "BGE Reranker Base",
        "provider": "BAAI",
        "task": "text-classification",
        "description": "Relevance scoring for query and passage pairs",
        "capabilities": [],
        "status": "active"
    },
    {
        "id": "@cf/huggingface/distilbert-sst-2-int8",
        "name": "DistilBERT SST-2",
        "provider": "HuggingFace",
        "task": "text-classification",
        "description": "Sentiment classification model",
        "capabilities": [],
        "status": "active"
    },
    
    # ============= Object Detection Models =============
    {
        "id": "@cf/facebook/detr-resnet-50",
        "name": "DETR ResNet-50",
        "provider": "Facebook",
        "task": "object-detection",
        "description": "End-to-end object detection on COCO dataset",
        "capabilities": [],
        "status": "beta"
    },
    
    # ============= Image Classification Models =============
    {
        "id": "@cf/microsoft/resnet-50",
        "name": "ResNet-50",
        "provider": "Microsoft",
        "task": "image-classification",
        "description": "50-layer deep CNN trained on ImageNet",
        "capabilities": [],
        "status": "active"
    },
    
    # ============= Summarization Models =============
    {
        "id": "@cf/facebook/bart-large-cnn",
        "name": "BART Large CNN",
        "provider": "Facebook",
        "task": "summarization",
        "description": "Seq2seq model for text summarization",
        "capabilities": [],
        "status": "beta"
    },
    
    # ============= Voice Activity Detection =============
    {
        "id": "@cf/pipecat-ai/smart-turn-v2",
        "name": "Smart Turn v2",
        "provider": "Pipecat AI",
        "task": "voice-activity-detection",
        "description": "Native audio turn detection model",
        "capabilities": ["batch", "real-time"],
        "status": "active"
    },
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
    Call Cloudflare Workers AI API for text generation
    Returns: {
        "response": str,
        "input_tokens": int,
        "output_tokens": int,
        "total_tokens": int,
        "response_time_ms": float
    }
    """
    start_time = time.time()
    
    # Build API URL
    url = f"{settings.cloudflare_api_base}/accounts/{settings.cloudflare_account_id}/ai/run/{model}"
    
    # Prepare request
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.cloudflare_api_key}"
    }
    
    payload = {
        "messages": messages,
        "stream": False,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    # Calculate input tokens
    input_text = " ".join([msg.get("content", "") for msg in messages])
    input_tokens = estimate_tokens(input_text)
    
    # Make request
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        
        if not response.is_success:
            error_text = response.text
            raise Exception(f"Cloudflare AI API error: {response.status_code} - {error_text}")
        
        data = response.json()
    
    # Extract response
    response_text = (
        data.get("result", {}).get("response") or
        data.get("result", {}).get("output_text") or
        data.get("result", {}).get("message") or
        "I'm sorry, I couldn't generate a response."
    )
    
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


async def call_cloudflare_ai_with_image(
    messages: List[Dict[str, str]],
    model: str,
    image_data: str,  # base64 encoded image
    temperature: float = 0.7,
    max_tokens: int = 2048
) -> Dict:
    """
    Call Cloudflare Workers AI API with image input for vision models
    """
    start_time = time.time()
    
    # Build API URL
    url = f"{settings.cloudflare_api_base}/accounts/{settings.cloudflare_account_id}/ai/run/{model}"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.cloudflare_api_key}"
    }
    
    # Add image to the last user message
    enhanced_messages = messages.copy()
    if enhanced_messages and enhanced_messages[-1]["role"] == "user":
        enhanced_messages[-1]["image"] = image_data
    
    payload = {
        "messages": enhanced_messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    # Calculate input tokens (approximate for multimodal)
    input_text = " ".join([msg.get("content", "") for msg in messages])
    input_tokens = estimate_tokens(input_text) + 256  # Add tokens for image
    
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        
        if not response.is_success:
            error_text = response.text
            raise Exception(f"Cloudflare AI API error: {response.status_code} - {error_text}")
        
        data = response.json()
    
    response_text = data.get("result", {}).get("response", "No response")
    output_tokens = estimate_tokens(response_text)
    total_tokens = input_tokens + output_tokens
    response_time_ms = (time.time() - start_time) * 1000
    
    return {
        "response": response_text,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "response_time_ms": response_time_ms,
        "has_image": True
    }


async def call_cloudflare_ai_transcribe(
    audio_data: bytes,
    model: str = "@cf/openai/whisper"
) -> Dict:
    """
    Call Cloudflare Workers AI API for speech-to-text transcription
    """
    start_time = time.time()
    
    url = f"{settings.cloudflare_api_base}/accounts/{settings.cloudflare_account_id}/ai/run/{model}"
    
    headers = {
        "Authorization": f"Bearer {settings.cloudflare_api_key}"
    }
    
    # Send audio as binary data
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(url, headers=headers, content=audio_data)
        
        if not response.is_success:
            error_text = response.text
            raise Exception(f"Cloudflare AI API error: {response.status_code} - {error_text}")
        
        data = response.json()
    
    transcription = data.get("result", {}).get("text", "")
    response_time_ms = (time.time() - start_time) * 1000
    
    return {
        "transcription": transcription,
        "response_time_ms": response_time_ms,
        "has_audio": True
    }


async def call_cloudflare_ai_generate_image(
    prompt: str,
    model: str = "@cf/black-forest-labs/flux-1-schnell",
    num_steps: int = 4
) -> Dict:
    """
    Call Cloudflare Workers AI API for text-to-image generation
    """
    start_time = time.time()
    
    url = f"{settings.cloudflare_api_base}/accounts/{settings.cloudflare_account_id}/ai/run/{model}"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.cloudflare_api_key}"
    }
    
    payload = {
        "prompt": prompt,
        "num_steps": num_steps
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        
        if not response.is_success:
            error_text = response.text
            raise Exception(f"Cloudflare AI API error: {response.status_code} - {error_text}")
        
        # Image returned as binary data
        image_data = response.content
    
    response_time_ms = (time.time() - start_time) * 1000
    
    return {
        "image_data": image_data,
        "response_time_ms": response_time_ms
    }


# For backward compatibility
import asyncio
