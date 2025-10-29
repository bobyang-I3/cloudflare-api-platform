"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ============= Auth Schemas =============
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    api_key: str
    is_active: bool
    is_admin: bool = False
    role: str = "user"
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= AI Schemas =============
class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str
    image: Optional[str] = None  # Optional base64 image data for vision models


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "@cf/meta/llama-3.1-8b-instruct"
    stream: bool = False
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=10000)


class VisionChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "@cf/meta/llama-3.2-11b-vision-instruct"
    image_data: str  # base64 encoded image
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=10000)


class TranscribeRequest(BaseModel):
    model: str = "@cf/openai/whisper"


class ImageGenerationRequest(BaseModel):
    prompt: str
    model: str = "@cf/black-forest-labs/flux-1-schnell"
    num_steps: int = Field(default=4, ge=1, le=20)


class ChatResponse(BaseModel):
    model: str
    response: str
    input_tokens: int
    output_tokens: int
    total_tokens: int


class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str = "Cloudflare"
    task: str = "text-generation"
    description: Optional[str] = None
    capabilities: Optional[List[str]] = None
    status: str = "active"


# ============= Usage Schemas =============
class UsageLogResponse(BaseModel):
    id: str
    timestamp: datetime
    model_name: str
    task_type: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    response_time_ms: float
    has_image: bool = False
    has_audio: bool = False
    
    class Config:
        from_attributes = True


class UsageStats(BaseModel):
    total_requests: int
    total_tokens: int
    total_input_tokens: int
    total_output_tokens: int
    by_model: dict  # {"model_name": {"requests": int, "tokens": int}}
    by_task: dict  # {"task_type": {"requests": int, "tokens": int}}

