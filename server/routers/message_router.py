"""
Message API routes for user-to-user messaging
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import User
from models_message import Message
from auth import get_current_user_from_token

router = APIRouter(prefix="/api/messages", tags=["messages"])


# ==================== Schemas ====================

class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    
    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    is_read: bool
    created_at: datetime
    sender: UserInfo
    
    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    receiver_id: str
    content: str


class ConversationUser(BaseModel):
    user: UserInfo
    last_message: str
    last_message_time: datetime
    unread_count: int


# ==================== Routes ====================

@router.get("/users", response_model=List[UserInfo])
async def get_all_users(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get all users (except current user) for messaging
    """
    users = db.query(User).filter(
        User.id != current_user.id,
        User.is_active == True
    ).all()
    
    return [UserInfo.from_orm(user) for user in users]


@router.get("/conversations", response_model=List[ConversationUser])
async def get_conversations(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get all conversations with other users
    """
    # Get all users the current user has messaged with
    subquery = db.query(
        func.coalesce(
            Message.sender_id,
            Message.receiver_id
        ).label('other_user_id')
    ).filter(
        or_(
            Message.sender_id == current_user.id,
            Message.receiver_id == current_user.id
        )
    ).distinct().subquery()
    
    # Get user details and last message for each conversation
    conversations = []
    
    # Get all unique user IDs from messages
    user_ids = db.query(Message.sender_id).filter(
        Message.receiver_id == current_user.id
    ).union(
        db.query(Message.receiver_id).filter(
            Message.sender_id == current_user.id
        )
    ).distinct().all()
    
    for (user_id,) in user_ids:
        if user_id == current_user.id:
            continue
            
        # Get user info
        other_user = db.query(User).filter(User.id == user_id).first()
        if not other_user:
            continue
        
        # Get last message
        last_msg = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
                and_(Message.sender_id == user_id, Message.receiver_id == current_user.id)
            )
        ).order_by(Message.created_at.desc()).first()
        
        if not last_msg:
            continue
        
        # Count unread messages
        unread_count = db.query(func.count(Message.id)).filter(
            Message.sender_id == user_id,
            Message.receiver_id == current_user.id,
            Message.is_read == False
        ).scalar()
        
        conversations.append(ConversationUser(
            user=UserInfo.from_orm(other_user),
            last_message=last_msg.content,
            last_message_time=last_msg.created_at,
            unread_count=unread_count or 0
        ))
    
    # Sort by last message time
    conversations.sort(key=lambda x: x.last_message_time, reverse=True)
    
    return conversations


@router.post("/send", response_model=MessageResponse)
async def send_message(
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Send a message to another user
    """
    # Validate receiver exists
    receiver = db.query(User).filter(User.id == request.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    if not receiver.is_active:
        raise HTTPException(status_code=400, detail="Receiver is not active")
    
    # Create message
    message = Message(
        sender_id=current_user.id,
        receiver_id=request.receiver_id,
        content=request.content
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # Add sender info for response
    message.sender = current_user
    
    return MessageResponse.from_orm(message)


@router.get("/{user_id}", response_model=List[MessageResponse])
async def get_messages_with_user(
    user_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get all messages with a specific user
    """
    # Validate user exists
    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all messages between current user and specified user
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
            and_(Message.sender_id == user_id, Message.receiver_id == current_user.id)
        )
    ).order_by(Message.created_at.asc()).all()
    
    # Mark received messages as read
    unread_messages = [msg for msg in messages if msg.receiver_id == current_user.id and not msg.is_read]
    for msg in unread_messages:
        msg.is_read = True
        msg.read_at = datetime.utcnow()
    
    if unread_messages:
        db.commit()
    
    return [MessageResponse.from_orm(msg) for msg in messages]


@router.get("/unread/count")
async def get_unread_count(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get total unread message count for current user
    """
    count = db.query(func.count(Message.id)).filter(
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).scalar()
    
    return {"unread_count": count or 0}

