"""
main.py
=======
FastAPI application exposing the flash-flood Random Forest model.

Endpoints:
    GET  /health   -> service + model status
    POST /predict                  -> run inference on a feature vector
    POST /manual-disaster-predict -> classify four manually entered environmental values

Run with:
    uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import predict as predict_module
import manual_predict as manual_predict_module


class PredictionRequest(BaseModel):
    rainfall_1h: float = Field(..., ge=0, description="Rainfall in the last hour (mm)")
    rainfall_3h: float = Field(..., ge=0, description="Rainfall in the last 3 hours (mm)")
    rainfall_6h: float = Field(..., ge=0, description="Rainfall in the last 6 hours (mm)")
    rainfall_24h: float = Field(..., ge=0, description="Rainfall in the last 24 hours (mm)")
    soil_moisture: float = Field(..., ge=0, le=100, description="Soil moisture percent")
    river_level: float = Field(..., ge=0, le=100, description="River level, percent of danger mark")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity percent")
    temperature: float = Field(..., description="Temperature in Celsius")
    slope: float = Field(..., ge=0, le=90, description="Terrain slope in degrees")
    elevation: float = Field(..., ge=0, description="Elevation in meters")
    historical_risk: float = Field(..., ge=0, le=1, description="Historical risk index, 0-1")


class PredictionResponse(BaseModel):
    risk_score: float
    risk_level: str
    confidence: float
    lead_time_minutes: int


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load the existing risk-score model and the manual classifier.
    try:
        predict_module.load_model()
    except predict_module.ModelNotLoadedError as e:
        print(f"[main] WARNING at startup: {e}")
        print("[main] The service will start, but /predict will return 503 until you run `python train.py`.")

    try:
        manual_predict_module.load_model()
    except manual_predict_module.ManualModelNotLoadedError as e:
        print(f"[main] WARNING at startup: {e}")
        print("[main] The manual disaster endpoint will return 503 until you run `python train_manual.py`.")

    yield
    # Shutdown: nothing to clean up currently.


app = FastAPI(
    title="Flash Flood Prediction ML Service",
    description=(
        "Prototype Random Forest inference service for the SIH 2026 "
        "AI-Based Hyper-Local Flash Flood Prediction and Early Warning System. "
        "Predictions are heuristic/prototype-grade and NOT a validated operational forecast."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": predict_module.is_model_loaded(),
        "manual_model_loaded": manual_predict_module.is_model_loaded(),
        "note": "Prototype ML service — predictions are not a validated operational forecast.",
    }


@app.post("/predict", response_model=PredictionResponse)
async def run_prediction(request: PredictionRequest):
    if not predict_module.is_model_loaded():
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Run `python train.py` to train and save a model, then restart the service.",
        )

    try:
        result = predict_module.predict(request.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except predict_module.ModelNotLoadedError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return result


class ManualDisasterRequest(BaseModel):
    rainfall: float = Field(..., ge=0, le=1000, description="Rainfall amount in mm")
    temperature: float = Field(..., ge=-50, le=60, description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity percent")
    soil_moisture: float = Field(..., ge=0, le=100, description="Soil moisture percent")


class ManualDisasterResponse(BaseModel):
    disaster: bool
    prediction: str
    probability: float
    risk_level: str
    message: str
    model_source: str


@app.post("/manual-disaster-predict", response_model=ManualDisasterResponse)
async def manual_disaster_prediction(request: ManualDisasterRequest):
    if not manual_predict_module.is_model_loaded():
        raise HTTPException(
            status_code=503,
            detail="Manual disaster model is not loaded. Run `python train_manual.py` and restart the service.",
        )

    try:
        return manual_predict_module.predict(request.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except manual_predict_module.ManualModelNotLoadedError as e:
        raise HTTPException(status_code=503, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
