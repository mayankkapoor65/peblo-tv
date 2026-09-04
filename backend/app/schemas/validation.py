import uuid
from typing import List, Dict, Optional, Any
from pydantic import BaseModel

class ValidationIssue(BaseModel):
    issue_type: str
    severity: str = "blocking"  # "blocking" or "warning"
    show_id: Optional[uuid.UUID] = None
    show_title: Optional[str] = None
    season_id: Optional[uuid.UUID] = None
    season_number: Optional[int] = None
    episode_id: Optional[uuid.UUID] = None
    episode_number: Optional[int] = None
    content_group_id: Optional[str] = None
    message: str

class ValidationSummary(BaseModel):
    total_shows: int
    ready_shows: int
    blocked_shows: int
    total_issues: int

class ValidationReport(BaseModel):
    can_publish: bool
    summary: ValidationSummary
    issues_by_category: Dict[str, List[ValidationIssue]]
    all_issues: List[ValidationIssue]
