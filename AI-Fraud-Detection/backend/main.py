# =============================================================================
# backend/main.py
# AI Fraud Detection System — FastAPI REST Backend
#
# Endpoints:
#   GET  /             → serves the frontend HTML
#   GET  /health       → model status check
#   POST /predict      → score a single transaction
#   POST /simulate     → score N random transactions at once
#   GET  /history      → return all scored transactions
#   DELETE /history    → clear history
#   GET  /stats        → aggregate statistics
# =============================================================================

import os
import sys
import random
import time
import uuid
from datetime import datetime
from typing import Optional, List
from pathlib import Path

# Add the project root to sys.path so we can import fraud_engine
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Import the fraud scoring engine
# ---------------------------------------------------------------------------
try:
    from fraud_engine import predict_transaction, _MODELS_LOADED, _CONFIG
    MODELS_READY = _MODELS_LOADED
except Exception as e:
    MODELS_READY = False
    print(f"[WARNING] Could not load fraud engine: {e}")
    print("          Run `python train_model.py` first.")

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title       = "AI Fraud Detection API",
    description = "Real-time payment fraud detection with RF + Isolation Forest",
    version     = "1.0.0",
    docs_url    = "/api/docs",
    redoc_url   = "/api/redoc",
)

# Allow the browser frontend to call the API (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["*"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)

# Mount the frontend static files
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# In-memory history store (resets on restart — fine for demo)
_history: List[dict] = []

# ---------------------------------------------------------------------------
# Pydantic models (request / response schemas)
# ---------------------------------------------------------------------------

class TransactionRequest(BaseModel):
    amount                  : float  = Field(...,  gt=0,   description="Transaction amount in dollars")
    transaction_type        : str    = Field(...,           description="PAYMENT | TRANSFER | CASH_OUT | CASH_IN | DEBIT")
    old_balance             : float  = Field(0.0,  ge=0)
    new_balance             : float  = Field(0.0,  ge=0,   description="UI only — not fed to model")
    destination_old_balance : float  = Field(0.0,  ge=0)
    destination_new_balance : float  = Field(0.0,  ge=0,   description="UI only — not fed to model")
    step                    : int    = Field(500,  ge=1)
    customer_avg_amount     : Optional[float] = Field(None, ge=0)
    familiar_pattern        : bool   = Field(True)

class SimulateRequest(BaseModel):
    n_transactions  : int   = Field(20, ge=1, le=200, description="Number of random transactions to generate")
    fraud_mix_pct   : float = Field(20.0, ge=0, le=100, description="% of transactions to make suspicious")

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def serve_frontend():
    """Serve the main HTML page."""
    index = FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse({"message": "Frontend not found. Place index.html in frontend/"})


@app.get("/health")
async def health_check():
    """Check if models are loaded and ready."""
    return {
        "status"       : "ready" if MODELS_READY else "models_not_loaded",
        "models_loaded": MODELS_READY,
        "transactions_scored": len(_history),
        "timestamp"    : datetime.now().isoformat(),
    }


@app.post("/predict")
async def predict(req: TransactionRequest):
    """
    Score a single transaction.
    Returns fraud_probability, risk status, action, reasons, and anomaly info.
    """
    if not MODELS_READY:
        raise HTTPException(
            status_code=503,
            detail="Models not loaded. Run `python train_model.py` first."
        )

    try:
        result = predict_transaction(
            amount                  = req.amount,
            transaction_type        = req.transaction_type,
            old_balance             = req.old_balance,
            new_balance             = req.new_balance,
            destination_old_balance = req.destination_old_balance,
            destination_new_balance = req.destination_new_balance,
            step                    = req.step,
            customer_avg_amount     = req.customer_avg_amount if (req.customer_avg_amount or 0) > 0 else None,
            familiar_pattern        = req.familiar_pattern,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Enrich with metadata before storing
    record = {
        "id"              : str(uuid.uuid4())[:8],
        "timestamp"       : datetime.now().isoformat(),
        "amount"          : req.amount,
        "type"            : req.transaction_type,
        "old_balance"     : req.old_balance,
        "customer_avg"    : req.customer_avg_amount,
        "familiar"        : req.familiar_pattern,
        **result,
    }
    _history.append(record)
    return record


@app.post("/simulate")
async def simulate(req: SimulateRequest):
    """
    Generate and score N random transactions at once.
    Returns the full list of results (use for batch demo).
    """
    if not MODELS_READY:
        raise HTTPException(status_code=503, detail="Models not loaded.")

    TYPES = ["PAYMENT", "TRANSFER", "CASH_OUT", "CASH_IN", "DEBIT"]
    results = []

    for i in range(req.n_transactions):
        is_susp = random.random() < (req.fraud_mix_pct / 100)

        if is_susp:
            tx_type  = random.choice(["TRANSFER", "CASH_OUT"])
            old_bal  = random.uniform(50_000, 500_000)
            amount   = random.uniform(old_bal * 0.7, old_bal)
            cust_avg = random.uniform(500, 5_000)
            familiar = False
        else:
            tx_type  = random.choice(TYPES)
            old_bal  = random.uniform(1_000, 50_000)
            amount   = random.uniform(100, min(old_bal, 5_000))
            cust_avg = random.uniform(amount * 0.5, amount * 2)
            familiar = random.random() > 0.2

        try:
            result = predict_transaction(
                amount                  = round(amount, 2),
                transaction_type        = tx_type,
                old_balance             = round(old_bal, 2),
                new_balance             = round(max(0, old_bal - amount), 2),
                destination_old_balance = round(random.uniform(0, 20_000), 2),
                destination_new_balance = round(random.uniform(0, 20_000), 2),
                customer_avg_amount     = round(cust_avg, 2),
                familiar_pattern        = familiar,
            )
        except Exception as e:
            continue

        record = {
            "id"          : str(uuid.uuid4())[:8],
            "timestamp"   : datetime.now().isoformat(),
            "amount"      : round(amount, 2),
            "type"        : tx_type,
            "old_balance" : round(old_bal, 2),
            "customer_avg": round(cust_avg, 2),
            "familiar"    : familiar,
            **result,
        }
        results.append(record)
        _history.append(record)

    return {"count": len(results), "transactions": results}


@app.get("/history")
async def get_history(limit: int = 100):
    """Return the last N scored transactions (most recent first)."""
    return {
        "count"       : len(_history),
        "transactions": list(reversed(_history[-limit:]))
    }


@app.delete("/history")
async def clear_history():
    """Clear all transaction history."""
    _history.clear()
    return {"message": "History cleared", "count": 0}


@app.get("/stats")
async def get_stats():
    """Return aggregate statistics over all scored transactions."""
    if not _history:
        return {
            "total": 0,
            "high_risk": 0, "medium_risk": 0, "low_risk": 0,
            "avg_fraud_probability": 0,
            "anomaly_count": 0,
        }

    total  = len(_history)
    high   = sum(1 for h in _history if h["status"].startswith("HIGH"))
    medium = sum(1 for h in _history if h["status"].startswith("MEDIUM"))
    low    = sum(1 for h in _history if h["status"].startswith("LOW"))
    avg_prob = sum(h["fraud_probability"] for h in _history) / total
    anomalies= sum(1 for h in _history if h.get("anomaly", False))

    # Type breakdown
    type_counts: dict = {}
    for h in _history:
        t = h.get("type", "UNKNOWN")
        type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "total"                : total,
        "high_risk"            : high,
        "medium_risk"          : medium,
        "low_risk"             : low,
        "suspicious_total"     : high + medium,
        "avg_fraud_probability": round(avg_prob, 2),
        "anomaly_count"        : anomalies,
        "type_breakdown"       : type_counts,
    }
