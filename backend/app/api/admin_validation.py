from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.validation import ValidationReport
from app.services.validation_service import ValidationService
from app.api.deps import require_role

router = APIRouter(prefix="/admin", tags=["Admin Validation"])

@router.get("/validation-report", response_model=ValidationReport)
async def get_validation_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """
    Returns everything blocking publish, grouped by issue category
    so editors and admins can immediately self-serve and fix issues.
    """
    return await ValidationService.generate_validation_report(db)
