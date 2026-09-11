"""
Platform Data Feedback Schemas
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class FeedbackRecordRequest(BaseModel):
    model_name: str = Field(..., description="Target model, e.g., 'price_predictor_baseline'")
    model_version: str = Field(..., description="Version of the model that served the prediction")
    prediction_id: Optional[str] = Field(default=None, description="Unique correlation identifier")
    features_logged: Dict[str, Any] = Field(..., description="Input feature payload captured at prediction time")
    prediction_output: Dict[str, Any] = Field(..., description="The predicted values provided by the model")
    actual_outcome: Optional[Dict[str, Any]] = Field(default=None, description="Observed ground truth transaction outcome")
    user_decision: Optional[str] = Field(default=None, description="Action taken by the user (e.g. ACCEPTED, OVERRIDDEN, REJECTED)")

class FeedbackRecordResponse(BaseModel):
    status: str = "RECORDED"
    record_id: str
    recorded_at: str
    message: str = "Feedback observation logged successfully for model evaluation."
