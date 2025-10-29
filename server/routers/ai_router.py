"""
AI/Chat routes - Cloudflare API proxy (SIMPLIFIED VERSION)
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import json
from database import get_db
from models import User, UsageLog
from schemas import ChatRequest, ChatResponse, ModelInfo
from auth import get_current_user_from_api_key
from cloudflare_client_simple import (
    call_cloudflare_ai, get_available_models,
    get_model_by_id
)
from check_limits import check_user_limits

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/models", response_model=List[ModelInfo])
def list_models():
    """
    Get list of available Cloudflare AI models
    Returns only verified working models
    """
    return get_available_models()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user_from_api_key),
    db: Session = Depends(get_db)
):
    """
    Send a chat request to Cloudflare AI and track usage
    Requires X-API-Key header
    """
    # Convert messages to dict format (preserve image data if present)
    messages = []
    for msg in request.messages:
        message_dict = {"role": msg.role, "content": msg.content}
        if hasattr(msg, 'image') and msg.image:
            message_dict["image"] = msg.image
        messages.append(message_dict)
    
    try:
        # Check user limits BEFORE making API call
        check_user_limits(current_user, db, estimated_tokens=request.max_tokens or 512)
        
        # Get model info
        model_info = get_model_by_id(request.model)
        if not model_info:
            raise HTTPException(
                status_code=400, 
                detail=f"Model '{request.model}' not found. Please select from available models."
            )
        
        task_type = model_info["task"]
        
        # Call Cloudflare AI
        result = await call_cloudflare_ai(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=False
        )
        
        # Check if request contains image
        has_image = any("image" in msg for msg in messages)
        
        # Log usage
        usage_log = UsageLog(
            user_id=current_user.id,
            model_name=request.model,
            task_type=task_type,
            input_tokens=result["input_tokens"],
            output_tokens=result["output_tokens"],
            total_tokens=result["total_tokens"],
            response_time_ms=result["response_time_ms"],
            has_image=has_image,
            has_audio=False,
            request_data=json.dumps({"messages": [{"role": m["role"], "content": m["content"], "has_image": "image" in m} for m in messages], "model": request.model})
        )
        db.add(usage_log)
        db.commit()
        
        # Return response
        return ChatResponse(
            model=request.model,
            response=result["response"],
            input_tokens=result["input_tokens"],
            output_tokens=result["output_tokens"],
            total_tokens=result["total_tokens"]
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI request failed: {str(e)}")


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user_from_api_key),
    db: Session = Depends(get_db)
):
    """
    Stream chat responses from Cloudflare AI
    Requires X-API-Key header
    """
    # Check user limits BEFORE making API call
    check_user_limits(current_user, db, estimated_tokens=request.max_tokens or 512)
    
    messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # Get model info
    model_info = get_model_by_id(request.model)
    if not model_info:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{request.model}' not found. Please select from available models."
        )
    
    async def event_generator():
        full_response_content = ""
        input_tokens_count = 0
        output_tokens_count = 0
        total_tokens_count = 0
        response_time_ms = 0.0
        task_type = model_info["task"]

        try:
            # Get full response
            result = await call_cloudflare_ai(
                messages=messages,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )
            
            full_response_content = result["response"]
            input_tokens_count = result["input_tokens"]
            output_tokens_count = result["output_tokens"]
            total_tokens_count = result["total_tokens"]
            response_time_ms = result["response_time_ms"]
            
            # Stream the response in chunks
            chunk_size = 20
            for i in range(0, len(full_response_content), chunk_size):
                chunk = full_response_content[i:i + chunk_size]
                yield f"data: {json.dumps({'token': chunk})}\n\n"
            
            # Send completion event with token stats
            yield f"data: {json.dumps({'done': True, 'tokens': result})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            # Log usage
            if full_response_content:
                usage_log = UsageLog(
                    user_id=current_user.id,
                    model_name=request.model,
                    task_type=task_type,
                    input_tokens=input_tokens_count,
                    output_tokens=output_tokens_count,
                    total_tokens=total_tokens_count,
                    response_time_ms=response_time_ms,
                    request_data=json.dumps({"messages": messages, "model": request.model}),
                    has_image=False,
                    has_audio=False,
                )
                db.add(usage_log)
                db.commit()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
