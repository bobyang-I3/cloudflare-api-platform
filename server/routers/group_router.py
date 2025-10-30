"""
Group Chat API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import User
from models_group import ChatGroup, GroupMember, GroupMessage
from auth import get_current_user_from_token

router = APIRouter(prefix="/api/groups", tags=["groups"])


# ==================== Schemas ====================

class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    
    class Config:
        from_attributes = True


class GroupMemberResponse(BaseModel):
    id: str
    group_id: str
    user_id: str
    is_admin: bool
    joined_at: datetime
    user: UserInfo
    
    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    avatar_url: Optional[str]
    creator_id: str
    created_at: datetime
    updated_at: datetime
    creator: UserInfo
    members: List[GroupMemberResponse] = []
    member_count: int = 0
    
    class Config:
        from_attributes = True


class GroupMessageResponse(BaseModel):
    id: str
    group_id: str
    sender_id: str
    content: str
    created_at: datetime
    sender: UserInfo
    
    class Config:
        from_attributes = True


class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    member_ids: List[str] = []  # Initial members to add


class SendGroupMessageRequest(BaseModel):
    content: str


class AddMemberRequest(BaseModel):
    user_id: str


# ==================== Routes ====================

@router.get("/", response_model=List[GroupResponse])
async def get_my_groups(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get all groups that the current user is a member of
    """
    # Get all group memberships for current user
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]
    
    if not group_ids:
        return []
    
    # Get groups
    groups = db.query(ChatGroup).filter(ChatGroup.id.in_(group_ids)).all()
    
    result = []
    for group in groups:
        members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        group_dict = GroupResponse.from_orm(group).dict()
        group_dict['members'] = [GroupMemberResponse.from_orm(m) for m in members]
        group_dict['member_count'] = len(members)
        result.append(GroupResponse(**group_dict))
    
    return result


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get group details
    """
    # Check if user is a member
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    
    group_dict = GroupResponse.from_orm(group).dict()
    group_dict['members'] = [GroupMemberResponse.from_orm(m) for m in members]
    group_dict['member_count'] = len(members)
    
    return GroupResponse(**group_dict)


@router.post("/", response_model=GroupResponse)
async def create_group(
    request: CreateGroupRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Create a new group
    """
    # Create group
    group = ChatGroup(
        name=request.name,
        description=request.description,
        avatar_url=request.avatar_url,
        creator_id=current_user.id
    )
    
    db.add(group)
    db.flush()  # Get group ID
    
    # Add creator as admin member
    creator_member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        is_admin=True
    )
    db.add(creator_member)
    
    # Add initial members
    for member_id in request.member_ids:
        if member_id != current_user.id:  # Don't add creator again
            # Verify user exists
            user = db.query(User).filter(User.id == member_id).first()
            if user:
                member = GroupMember(
                    group_id=group.id,
                    user_id=member_id,
                    is_admin=False
                )
                db.add(member)
    
    db.commit()
    db.refresh(group)
    
    # Get all members for response
    members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    
    group_dict = GroupResponse.from_orm(group).dict()
    group_dict['members'] = [GroupMemberResponse.from_orm(m) for m in members]
    group_dict['member_count'] = len(members)
    
    return GroupResponse(**group_dict)


@router.post("/{group_id}/members", response_model=GroupMemberResponse)
async def add_member(
    group_id: str,
    request: AddMemberRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Add a member to group (admin only)
    """
    # Check if user is an admin of this group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_admin == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Only group admins can add members")
    
    # Check if user to add exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a member
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == request.user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    # Add member
    new_member = GroupMember(
        group_id=group_id,
        user_id=request.user_id,
        is_admin=False
    )
    
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return GroupMemberResponse.from_orm(new_member)


@router.get("/{group_id}/messages", response_model=List[GroupMessageResponse])
async def get_group_messages(
    group_id: str,
    limit: int = 100,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get messages from a group
    """
    # Check if user is a member
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get messages
    messages = db.query(GroupMessage).filter(
        GroupMessage.group_id == group_id
    ).order_by(GroupMessage.created_at.asc()).limit(limit).all()
    
    return [GroupMessageResponse.from_orm(m) for m in messages]


@router.post("/{group_id}/messages", response_model=GroupMessageResponse)
async def send_group_message(
    group_id: str,
    request: SendGroupMessageRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Send a message to a group
    """
    # Check if user is a member
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Create message
    message = GroupMessage(
        group_id=group_id,
        sender_id=current_user.id,
        content=request.content
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return GroupMessageResponse.from_orm(message)


@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Delete a group (admin only)
    """
    # Check if user is an admin of this group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_admin == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Only group admins can delete the group")
    
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    db.delete(group)
    db.commit()
    
    return {"message": "Group deleted successfully"}


@router.delete("/{group_id}/members/{user_id}")
async def remove_member(
    group_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Remove a member from group (admin only or self)
    """
    # Check if removing self
    if user_id == current_user.id:
        # Allow leaving group
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if membership:
            db.delete(membership)
            db.commit()
            return {"message": "Left group successfully"}
        else:
            raise HTTPException(status_code=404, detail="Not a member of this group")
    
    # Check if user is an admin
    admin_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_admin == True
    ).first()
    
    if not admin_membership:
        raise HTTPException(status_code=403, detail="Only group admins can remove members")
    
    # Remove member
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=404, detail="User is not a member")
    
    db.delete(membership)
    db.commit()
    
    return {"message": "Member removed successfully"}


