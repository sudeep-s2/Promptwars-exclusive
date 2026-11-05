# =============================================================================
# fraud_engine.py
# AI Fraud Detection System — Scoring / Inference Engine
#
# This module:
#   - Loads trained models ONCE at import time (fast repeated calls)
#   - Provides predict_transaction() for single-transaction scoring
#   - Implements a 4-tier decision engine with customer-context layer
#   - Can be run directly (CLI) to demo the 3 benchmark scenarios
# =============================================================================

import os
import sys
import warnings
import numpy as np
import pandas as pd
import joblib

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# PATHS
# ---------------------------------------------------------------------------
MODELS_DIR = "models"
_FRAUD_MODEL_PATH   = os.path.join(MODELS_DIR, "fraud_model.pkl")
_ANOMALY_MODEL_PATH = os.path.join(MODELS_DIR, "anomaly_model.pkl")
_CONFIG_PATH        = os.path.join(MODELS_DIR, "config.pkl")

# ---------------------------------------------------------------------------
# LOAD MODELS AT IMPORT TIME
# This block runs once when the module is first imported, so Streamlit
# doesn't reload models on every user interaction.
# ---------------------------------------------------------------------------
def _load_models():
    """Load all saved model files and return them. Raises clear errors."""
    missing = [p for p in [_FRAUD_MODEL_PATH, _ANOMALY_MODEL_PATH, _CONFIG_PATH]
               if not os.path.exists(p)]
    if missing:
        raise FileNotFoundError(
            f"Model files not found: {missing}\n"
            "Please run  `python train_model.py`  first."
        )
    rf_model      = joblib.load(_FRAUD_MODEL_PATH)
    anomaly_model = joblib.load(_ANOMALY_MODEL_PATH)
    config        = joblib.load(_CONFIG_PATH)
    return rf_model, anomaly_model, config

try:
    _RF_MODEL, _ANOMALY_MODEL, _CONFIG = _load_models()
    _FEATURE_COLUMNS   = _CONFIG["feature_columns"]
    _ANOMALY_THRESHOLD = _CONFIG["anomaly_threshold"]
    _RF_THRESHOLD      = _CONFIG["rf_threshold"]
    _MODELS_LOADED     = True
except FileNotFoundError as _load_err:
    # Graceful degradation — the app can still launch; it will show an error
    # when predict_transaction is actually called.
    _MODELS_LOADED = False
    _LOAD_ERROR    = str(_load_err)


# ---------------------------------------------------------------------------
# MAIN INFERENCE FUNCTION
# ---------------------------------------------------------------------------
def predict_transaction(
    amount: float,
    transaction_type: str,
    old_balance: float,
    new_balance: float,                   # accepted for UI realism; not used in model
    destination_old_balance: float = 0.0,
    destination_new_balance: float = 0.0, # accepted for UI realism; not used in model
    step: int = 500,
    customer_avg_amount: float = None,
    familiar_pattern: bool = False,
) -> dict:
    """
    Score a single transaction and return a risk assessment.

    Parameters
    ----------
    amount                 : Transaction amount
    transaction_type       : One of PAYMENT, TRANSFER, CASH_OUT, CASH_IN, DEBIT
    old_balance            : Sender's balance BEFORE the transaction
    new_balance            : Sender's balance AFTER (UI only — not fed to model)
    destination_old_balance: Recipient's balance BEFORE
    destination_new_balance: Recipient's balance AFTER (UI only)
    step                   : Time step (hour) in the simulation
    customer_avg_amount    : Customer's historical average transaction amount
    familiar_pattern       : Whether this matches the customer's known patterns

    Returns
    -------
    dict with keys: fraud_probability, anomaly, anomaly_score,
                    status, action, reasons
    """
    # Guard — models must be loaded
    if not _MODELS_LOADED:
        raise RuntimeError(_LOAD_ERROR)

    # -----------------------------------------------------------------------
    # BUILD FEATURE ROW
    # -----------------------------------------------------------------------
    # Create a single-row DataFrame matching training features exactly.
    # Note: new_balance fields are intentionally EXCLUDED (data leakage risk).
    row = pd.DataFrame([{
        "step"            : step,
        "amount"          : amount,
        "oldbalanceOrg"   : old_balance,
        "oldbalanceDest"  : destination_old_balance,
        "type"            : transaction_type,
    }])

    # One-hot encode the 'type' column exactly as during training
    type_dummies = pd.get_dummies(row["type"], prefix="type", dtype=int)
    row = pd.concat([row.drop(columns=["type"]), type_dummies], axis=1)

    # Reindex to the EXACT column order saved during training.
    # - Any type columns not present are filled with 0
    # - newbalance columns (if accidentally included) are dropped
    row = row.reindex(columns=_FEATURE_COLUMNS, fill_value=0)

    X = row.values  # shape (1, n_features)

    # -----------------------------------------------------------------------
    # MODEL PREDICTIONS
    # -----------------------------------------------------------------------
    # Random Forest: probability of fraud
    fraud_prob = float(_RF_MODEL.predict_proba(X)[0, 1])

    # IsolationForest: anomaly score (negative = more anomalous)
    raw_anomaly_score = float(_ANOMALY_MODEL.decision_function(X)[0])
    is_anomaly        = raw_anomaly_score < _ANOMALY_THRESHOLD

    # -----------------------------------------------------------------------
    # CUSTOMER CONTEXT LAYER
    # Checks whether this transaction "fits" the customer's known behaviour.
    # A transaction is "normal" if:
    #   - We have a customer average amount (not None / zero)
    #   - The amount is at most 1.5× the customer's typical amount
    #   - The customer pattern flag is True
    # -----------------------------------------------------------------------
    normal_customer_pattern = (
        customer_avg_amount is not None
        and customer_avg_amount > 0
        and amount <= 1.5 * customer_avg_amount
        and familiar_pattern
    )

    # -----------------------------------------------------------------------
    # DECISION LOGIC — 4-TIER RISK ENGINE
    # -----------------------------------------------------------------------
    reasons = []  # human-readable explanation strings

    # Collect context clues for the reasons list
    if fraud_prob >= 0.80:
        reasons.append(f"Very high model fraud probability ({fraud_prob*100:.1f}%)")

    if fraud_prob >= 0.30 and fraud_prob < 0.80:
        reasons.append(f"Elevated model fraud probability ({fraud_prob*100:.1f}%)")

    if is_anomaly:
        reasons.append(
            f"Flagged as statistical anomaly "
            f"(score {raw_anomaly_score:.4f} < threshold {_ANOMALY_THRESHOLD:.4f})"
        )

    if customer_avg_amount is not None and customer_avg_amount > 0:
        ratio = amount / customer_avg_amount
        if ratio > 1.5:
            reasons.append(
                f"Amount is {ratio:.1f}× the customer's typical amount "
                f"(${customer_avg_amount:,.0f} avg)"
            )
        else:
            reasons.append(
                f"Amount is within 1.5× of customer's typical amount "
                f"(${customer_avg_amount:,.0f} avg)"
            )

    if familiar_pattern:
        reasons.append("Transaction matches customer's familiar pattern")
    else:
        reasons.append("Transaction does NOT match a familiar pattern")

    # --- Tier 1: HIGH RISK — context NEVER overrides this ---
    if fraud_prob >= 0.80:
        status = "HIGH RISK"
        action = "FLAG FOR FRAUD REVIEW"

    # --- Tier 2: MEDIUM RISK — elevated probability or anomaly ---
    elif (fraud_prob >= 0.30 or is_anomaly) and not (
        normal_customer_pattern and fraud_prob < 0.50
    ):
        status = "MEDIUM RISK"
        action = "REQUEST ADDITIONAL VERIFICATION"

    # --- Tier 3: Context clears a borderline flag ---
    elif normal_customer_pattern:
        status = "LOW RISK - CONTEXT MATCH"
        action = "APPROVE WITH MONITORING"

    # --- Tier 4: Genuinely low risk ---
    else:
        status = "LOW RISK"
        action = "APPROVE TRANSACTION"

    # -----------------------------------------------------------------------
    # RETURN RESULTS
    # -----------------------------------------------------------------------
    return {
        "fraud_probability": round(fraud_prob * 100, 2),  # e.g. 73.45 (percent)
        "anomaly"          : bool(is_anomaly),
        "anomaly_score"    : round(raw_anomaly_score, 4),
        "status"           : status,
        "action"           : action,
        "reasons"          : reasons,
    }


# ---------------------------------------------------------------------------
# CLI DEMO — runs the 3 benchmark scenarios when executed directly
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("\n" + "="*60)
    print("  FRAUD ENGINE — CLI DEMO (3 Benchmark Scenarios)")
    print("="*60)

    scenarios = [
        {
            "label"               : "Scenario 1 — Normal Payment",
            "amount"              : 500,
            "transaction_type"    : "PAYMENT",
            "old_balance"         : 10000,
            "new_balance"         : 9500,
            "customer_avg_amount" : 2000,
            "familiar_pattern"    : True,
        },
        {
            "label"               : "Scenario 2 — Suspicious Transfer",
            "amount"              : 90000,
            "transaction_type"    : "TRANSFER",
            "old_balance"         : 100000,
            "new_balance"         : 10000,
            "customer_avg_amount" : 2000,
            "familiar_pattern"    : False,
        },
        {
            "label"               : "Scenario 3 — Genuine High-Value Transfer",
            "amount"              : 80000,
            "transaction_type"    : "TRANSFER",
            "old_balance"         : 200000,
            "new_balance"         : 120000,
            "customer_avg_amount" : 90000,
            "familiar_pattern"    : True,
        },
    ]

    for s in scenarios:
        label = s.pop("label")
        print(f"\n{'─'*55}")
        print(f"  {label}")
        print(f"{'─'*55}")
        print(f"  Inputs: {s}")

        try:
            result = predict_transaction(**s)
            print(f"  Status           : {result['status']}")
            print(f"  Action           : {result['action']}")
            print(f"  Fraud Probability: {result['fraud_probability']}%")
            print(f"  Is Anomaly       : {result['anomaly']} "
                  f"(score: {result['anomaly_score']})")
            print("  Reasons:")
            for r in result["reasons"]:
                print(f"    • {r}")
        except RuntimeError as e:
            print(f"  ❌  {e}")

    print("\n" + "="*60 + "\n")
