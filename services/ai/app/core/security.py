"""
SIH26033 Internal Service Security & Authentication
---------------------------------------------------
Enforces defense-in-depth authorization between NestJS and FastAPI.
"""

from typing import Optional
from fastapi import Header, HTTPException, status
from .config import settings

async def verify_internal_api_key(x_internal_api_key: Optional[str] = Header(None)):
    """
    Verifies that caller possesses the pre-shared internal communication key.
    Prevents unauthorized direct caller access if network perimeter is breached.
    """
    expected_key = settings.AI_SERVICE_INTERNAL_KEY
    if expected_key:
        if not x_internal_api_key or x_internal_api_key != expected_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Missing or invalid internal AI service authorization key"
                    }
                }
            )
