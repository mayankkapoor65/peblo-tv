from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserLogin, TokenResponse, UserRead
from app.api.deps import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "email": user.email}
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
        )
    )

@router.post("/switch-demo-role/{role}", response_model=TokenResponse)
async def switch_demo_role(role: str, db: AsyncSession = Depends(get_db)):
    """
    Convenience endpoint for UI role switching between 'admin' and 'editor' in demo mode.
    """
    role = role.lower()
    if role not in ["admin", "editor"]:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'editor'")
        
    result = await db.execute(select(User).where(User.role == role))
    user = result.scalars().first()
    
    if not user:
        user = User(
            email=f"{role}@peblo.tv",
            full_name=f"Demo {role.capitalize()}",
            role=role,
            hashed_password="",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "email": user.email}
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
        )
    )

@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserRead(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
    )
