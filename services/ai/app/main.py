"""
SIH26033 AI Foundation Service - Main Entrypoint
------------------------------------------------
FastAPI service exposing baseline agricultural AI/ML capabilities.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from .core.config import settings
from .core.logging import logger
from .core.errors import (
    AIModelNotFoundError,
    AIInferenceError,
    validation_exception_handler,
    model_not_found_handler,
    inference_error_handler,
    generic_exception_handler
)
from .services.model_registry import model_registry
from .api.v1.router import api_v1_router
from .api.v1.health import router as health_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load ML model artifacts into memory
    logger.info("Initializing AI model registry and loading model artifacts...")
    model_registry.load_models()
    is_ready, status = model_registry.check_readiness()
    logger.info(f"AI Service startup readiness: {is_ready} -> {status}")
    yield
    # Shutdown
    logger.info("AI Service shutting down.")

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.VERSION,
    description="Production-grade AI/ML inference service for SIH26033 Agricultural Marketplace.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS: strictly limited to internal local services
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Register Custom Exception Handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(AIModelNotFoundError, model_not_found_handler)
app.add_exception_handler(AIInferenceError, inference_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Root level health & readiness endpoints
app.include_router(health_router)

# Mount Versioned API Router
app.include_router(api_v1_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "status": "RUNNING",
        "documentation": "/docs"
    }
