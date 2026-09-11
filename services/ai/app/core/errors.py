"""
SIH26033 Structured Error Envelope & Exception Handlers
-------------------------------------------------------
Prevents leaking internal stack traces or database connection strings.
"""

from typing import Any, List, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from .logging import logger

class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str

class ErrorEnvelope(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None

class AIModelNotFoundError(Exception):
    def __init__(self, model_name: str):
        self.model_name = model_name
        super().__init__(f"AI model '{model_name}' artifact not found or failed to load")

class AIInferenceError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details: List[ErrorDetail] = []
    for err in exc.errors():
        field_str = ".".join([str(loc) for loc in err.get("loc", []) if loc != "body"])
        details.append(ErrorDetail(field=field_str or None, message=err.get("msg", "Invalid value")))

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request payload failed schema validation",
                "details": [d.model_dump() for d in details]
            }
        }
    )

async def model_not_found_handler(request: Request, exc: AIModelNotFoundError):
    logger.error(f"Model not found: {exc.model_name}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": {
                "code": "MODEL_UNAVAILABLE",
                "message": str(exc),
                "details": None
            }
        }
    )

async def inference_error_handler(request: Request, exc: AIInferenceError):
    logger.error(f"Inference error on {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INFERENCE_ERROR",
                "message": "An error occurred while evaluating the ML model",
                "details": [{"message": exc.message}]
            }
        }
    )

async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred in the AI service",
                "details": None
            }
        }
    )
