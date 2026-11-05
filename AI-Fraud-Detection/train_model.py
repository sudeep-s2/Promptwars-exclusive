# =============================================================================
# train_model.py  —  AI Fraud Detection System - Model Training Script
# =============================================================================

import os
import sys
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    average_precision_score,
    precision_recall_curve,
)

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# STEP 0 - Paths and constants
# ---------------------------------------------------------------------------
DATASET_PATH = os.path.join("dataset", "paysim.csv")
MODELS_DIR   = "models"
SAMPLE_SIZE  = 300_000
RANDOM_STATE = 42

FEATURE_COLS_BASE = ["step", "amount", "oldbalanceOrg", "oldbalanceDest"]

# ---------------------------------------------------------------------------
# STEP 1 - Load dataset
# ---------------------------------------------------------------------------
print("\n" + "="*60)
print("  AI FRAUD DETECTION -- MODEL TRAINING")
print("="*60)
print(f"\n[1/8] Loading dataset from '{DATASET_PATH}' ...")

try:
    df = pd.read_csv(DATASET_PATH)
except FileNotFoundError:
    print(f"\nERROR: Dataset not found at '{DATASET_PATH}'.")
    print("    Please place paysim.csv inside the 'dataset/' folder.")
    sys.exit(1)
except Exception as e:
    print(f"\nERROR reading dataset: {e}")
    sys.exit(1)

print(f"    Loaded {len(df):,} rows x {len(df.columns)} columns.")
print(f"    Fraud rows in full dataset: {df['isFraud'].sum():,} "
      f"({df['isFraud'].mean()*100:.2f}%)")

# ---------------------------------------------------------------------------
# STEP 2 - Stratified sampling
# ---------------------------------------------------------------------------
print(f"\n[2/8] Sampling up to {SAMPLE_SIZE:,} rows (all fraud rows kept) ...")

fraud_df = df[df["isFraud"] == 1].copy()
legit_df = df[df["isFraud"] == 0].copy()
legit_sample_size = max(0, SAMPLE_SIZE - len(fraud_df))

if len(df) > SAMPLE_SIZE:
    legit_sampled = legit_df.sample(
        n=min(legit_sample_size, len(legit_df)),
        random_state=RANDOM_STATE
    )
    df = pd.concat([fraud_df, legit_sampled]).reset_index(drop=True)
    print(f"    Sampled dataset: {len(df):,} rows "
          f"({len(fraud_df):,} fraud + {len(legit_sampled):,} legit)")
else:
    print(f"    Dataset is smaller than {SAMPLE_SIZE:,} -- using all rows.")

# ---------------------------------------------------------------------------
# STEP 3 - Feature engineering
# ---------------------------------------------------------------------------
print("\n[3/8] Engineering features ...")

type_dummies  = pd.get_dummies(df["type"], prefix="type", dtype=int)
df_features   = pd.concat([df[FEATURE_COLS_BASE], type_dummies], axis=1)
feature_columns = list(df_features.columns)

print(f"    Feature columns ({len(feature_columns)}): {feature_columns}")

X = df_features.values
y = df["isFraud"].values

# ---------------------------------------------------------------------------
# STEP 4 - Chronological split
# ---------------------------------------------------------------------------
print("\n[4/8] Splitting data chronologically (80% train / 20% test) ...")

sort_idx  = df["step"].argsort().values
X_sorted  = X[sort_idx]
y_sorted  = y[sort_idx]
df_sorted = df.iloc[sort_idx].reset_index(drop=True)

split_point     = int(len(X_sorted) * 0.80)
X_train, X_test = X_sorted[:split_point], X_sorted[split_point:]
y_train, y_test = y_sorted[:split_point], y_sorted[split_point:]

print(f"    Train: {len(X_train):,} rows | Test: {len(X_test):,} rows")
print(f"    Train fraud rate: {y_train.mean()*100:.2f}%  "
      f"| Test fraud rate: {y_test.mean()*100:.2f}%")

# ---------------------------------------------------------------------------
# STEP 5 - Train RandomForestClassifier
# ---------------------------------------------------------------------------
print("\n[5/8] Training RandomForestClassifier (this may take a few minutes) ...")

rf_model = RandomForestClassifier(
    n_estimators=150,
    class_weight="balanced_subsample",
    n_jobs=-1,
    random_state=RANDOM_STATE,
    max_depth=20,
    min_samples_leaf=5,
)
rf_model.fit(X_train, y_train)
print("    [OK] RandomForest training complete.")

# ---------------------------------------------------------------------------
# STEP 6 - Train IsolationForest
# ---------------------------------------------------------------------------
print("\n[6/8] Training IsolationForest on legitimate transactions only ...")

legit_mask_train = y_train == 0
X_train_legit    = X_train[legit_mask_train]

iso_model = IsolationForest(
    n_estimators=100,
    contamination=0.01,
    n_jobs=-1,
    random_state=RANDOM_STATE,
)
iso_model.fit(X_train_legit)

legit_scores      = iso_model.decision_function(X_train_legit)
ANOMALY_PERCENTILE = 3
anomaly_threshold  = float(np.percentile(legit_scores, ANOMALY_PERCENTILE))
print("    [OK] IsolationForest training complete.")
print(f"    Anomaly threshold (p{ANOMALY_PERCENTILE} of legit scores): "
      f"{anomaly_threshold:.4f}")

# ---------------------------------------------------------------------------
# STEP 7 - Evaluate on test set
# ---------------------------------------------------------------------------
print("\n[7/8] Evaluating on test set ...")

y_proba = rf_model.predict_proba(X_test)[:, 1]

y_pred_default = (y_proba >= 0.50).astype(int)
cm = confusion_matrix(y_test, y_pred_default)
TN, FP, FN, TP = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
FPR = FP / (FP + TN) if (FP + TN) > 0 else 0.0

print("\n  -- Classification Report (threshold=0.50) --")
print(classification_report(y_test, y_pred_default,
                             target_names=["Legit", "Fraud"], digits=4))

print("  -- Confusion Matrix --")
print(f"    TN={TN:,}  FP={FP:,}")
print(f"    FN={FN:,}  TP={TP:,}")
print(f"\n  False Positive Rate  : {FPR:.4f} ({FPR*100:.2f}%)")
print(f"  ROC-AUC              : {roc_auc_score(y_test, y_proba):.4f}")
print(f"  PR-AUC (Avg Prec.)   : {average_precision_score(y_test, y_proba):.4f}")

print("\n  -- Optimal Threshold Selection (recall >= 0.85) --")
precisions, recalls, thresholds = precision_recall_curve(y_test, y_proba)

best_threshold = 0.50
best_precision = 0.0

for prec, rec, thr in zip(precisions[:-1], recalls[:-1], thresholds):
    if rec >= 0.85 and prec > best_precision:
        best_precision = prec
        best_threshold = thr

print(f"    Chosen threshold : {best_threshold:.4f}")
print(f"    Precision at thr : {best_precision:.4f}")

y_pred_optimal = (y_proba >= best_threshold).astype(int)
cm2 = confusion_matrix(y_test, y_pred_optimal)
TN2, FP2, FN2, TP2 = cm2.ravel() if cm2.size == 4 else (0, 0, 0, 0)
FPR2 = FP2 / (FP2 + TN2) if (FP2 + TN2) > 0 else 0.0

print(f"\n  -- Metrics at Optimal Threshold ({best_threshold:.4f}) --")
print(classification_report(y_test, y_pred_optimal,
                             target_names=["Legit", "Fraud"], digits=4))
print(f"    TN={TN2:,}  FP={FP2:,}  FN={FN2:,}  TP={TP2:,}")
print(f"    False Positive Rate: {FPR2:.4f} ({FPR2*100:.2f}%)")

# ---------------------------------------------------------------------------
# STEP 8 - Save models
# ---------------------------------------------------------------------------
print(f"\n[8/8] Saving models to '{MODELS_DIR}/' ...")

os.makedirs(MODELS_DIR, exist_ok=True)

config = {
    "feature_columns"    : feature_columns,
    "anomaly_threshold"  : anomaly_threshold,
    "rf_threshold"       : float(best_threshold),
    "rf_threshold_default": 0.50,
    "anomaly_percentile" : ANOMALY_PERCENTILE,
}

joblib.dump(rf_model,  os.path.join(MODELS_DIR, "fraud_model.pkl"),   compress=3)
joblib.dump(iso_model, os.path.join(MODELS_DIR, "anomaly_model.pkl"), compress=3)
joblib.dump(config,    os.path.join(MODELS_DIR, "config.pkl"))

print("    [SAVED] fraud_model.pkl")
print("    [SAVED] anomaly_model.pkl")
print("    [SAVED] config.pkl")

print("\n" + "="*60)
print("  Training completed!")
print("="*60 + "\n")
