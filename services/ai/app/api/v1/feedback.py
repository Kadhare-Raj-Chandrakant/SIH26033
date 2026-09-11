"""
Platform Feedback Recording Route
"""

from fastapi import APIRouter, status
from ...schemas.feedback import FeedbackRecordRequest, FeedbackRecordResponse
from ...services.model_registry import model_registry

router = APIRouter(prefix="/feedback", tags=["Platform Feedback"])

@router.post("/record", response_model=FeedbackRecordResponse, status_code=status.HTTP_201_CREATED)
async def record_feedback(req: FeedbackRecordRequest):
    """
    Logs prediction inputs, model outputs, and observed user decisions or actual outcomes
    to close the feedback loop for future model evaluation and retraining.
    """
    return model_registry.record_feedback(req)
