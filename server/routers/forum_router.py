"""
Forum API routes for posts, comments, and likes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import User
from models_forum import Post, Comment, PostLike
from auth import get_current_user_from_token

router = APIRouter(prefix="/api/forum", tags=["forum"])


# ==================== Schemas ====================

class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    
    class Config:
        from_attributes = True


class CreatePostRequest(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None


class CreateCommentRequest(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    content: str
    created_at: datetime
    author: UserInfo
    
    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    image_url: Optional[str]
    likes_count: int
    comments_count: int
    created_at: datetime
    updated_at: datetime
    author: UserInfo
    is_liked: bool = False
    comments: List[CommentResponse] = []
    
    class Config:
        from_attributes = True


# ==================== Routes ====================

@router.get("/posts", response_model=List[PostResponse])
async def get_all_posts(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get all forum posts (newest first)
    """
    posts = db.query(Post).order_by(desc(Post.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for post in posts:
        # Check if current user liked this post
        is_liked = db.query(PostLike).filter(
            PostLike.post_id == post.id,
            PostLike.user_id == current_user.id
        ).first() is not None
        
        # Get comments
        comments = db.query(Comment).filter(Comment.post_id == post.id).order_by(Comment.created_at).all()
        
        post_dict = PostResponse.from_orm(post).dict()
        post_dict['is_liked'] = is_liked
        post_dict['comments'] = [CommentResponse.from_orm(c) for c in comments]
        
        result.append(PostResponse(**post_dict))
    
    return result


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get a specific post by ID
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if current user liked this post
    is_liked = db.query(PostLike).filter(
        PostLike.post_id == post.id,
        PostLike.user_id == current_user.id
    ).first() is not None
    
    # Get comments
    comments = db.query(Comment).filter(Comment.post_id == post.id).order_by(Comment.created_at).all()
    
    post_dict = PostResponse.from_orm(post).dict()
    post_dict['is_liked'] = is_liked
    post_dict['comments'] = [CommentResponse.from_orm(c) for c in comments]
    
    return PostResponse(**post_dict)


@router.post("/posts", response_model=PostResponse)
async def create_post(
    request: CreatePostRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Create a new forum post
    """
    post = Post(
        user_id=current_user.id,
        title=request.title,
        content=request.content,
        image_url=request.image_url
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    
    post_dict = PostResponse.from_orm(post).dict()
    post_dict['is_liked'] = False
    post_dict['comments'] = []
    
    return PostResponse(**post_dict)


@router.post("/posts/{post_id}/comments", response_model=CommentResponse)
async def create_comment(
    post_id: str,
    request: CreateCommentRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Add a comment to a post
    """
    # Verify post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Create comment
    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=request.content
    )
    
    db.add(comment)
    
    # Update post comment count
    post.comments_count = db.query(Comment).filter(Comment.post_id == post_id).count() + 1
    
    db.commit()
    db.refresh(comment)
    
    return CommentResponse.from_orm(comment)


@router.post("/posts/{post_id}/like")
async def toggle_like(
    post_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Toggle like on a post
    """
    # Verify post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already liked
    existing_like = db.query(PostLike).filter(
        PostLike.post_id == post_id,
        PostLike.user_id == current_user.id
    ).first()
    
    if existing_like:
        # Unlike
        db.delete(existing_like)
        post.likes_count = max(0, post.likes_count - 1)
        is_liked = False
    else:
        # Like
        new_like = PostLike(
            post_id=post_id,
            user_id=current_user.id
        )
        db.add(new_like)
        post.likes_count += 1
        is_liked = True
    
    db.commit()
    
    return {
        "is_liked": is_liked,
        "likes_count": post.likes_count
    }


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Delete a post (only author or admin can delete)
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check permission
    if post.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
    db.delete(post)
    db.commit()
    
    return {"message": "Post deleted successfully"}


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Delete a comment (only author or admin can delete)
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check permission
    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    # Update post comment count
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if post:
        post.comments_count = max(0, post.comments_count - 1)
    
    db.delete(comment)
    db.commit()
    
    return {"message": "Comment deleted successfully"}


