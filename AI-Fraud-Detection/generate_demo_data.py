# generate_demo_data.py
# Creates a synthetic PaySim-compatible CSV so you can run everything
# without downloading from Kaggle. ~200,000 rows, realistic distributions.

import numpy as np
import pandas as pd
import os

np.random.seed(42)
print("\n[1/4] Generating synthetic PaySim-like dataset...")

N_LEGIT  = 195_000
N_FRAUD  =   5_000   # ~2.5% fraud rate (PaySim is ~0.1% but we boost for demo)
N_TOTAL  = N_LEGIT + N_FRAUD

TYPES = ["PAYMENT", "TRANSFER", "CASH_OUT", "CASH_IN", "DEBIT"]

# ── Helper: random account IDs ──────────────────────────────
def account_ids(prefix, n):
    return [f"{prefix}{np.random.randint(1_000_000, 9_999_999)}" for _ in range(n)]

# ── LEGITIMATE transactions ──────────────────────────────────
print("[2/4] Building legitimate transactions...")
legit_types   = np.random.choice(TYPES, N_LEGIT,
                  p=[0.35, 0.20, 0.25, 0.15, 0.05])
legit_amounts = np.abs(np.random.lognormal(mean=6.5, sigma=1.8, size=N_LEGIT))
legit_amounts = np.clip(legit_amounts, 1, 400_000)
legit_old_org = np.abs(np.random.lognormal(mean=9.0, sigma=1.5, size=N_LEGIT))
legit_new_org = np.maximum(0, legit_old_org - legit_amounts)
legit_old_dst = np.abs(np.random.lognormal(mean=8.0, sigma=1.8, size=N_LEGIT))
legit_new_dst = legit_old_dst + legit_amounts

legit_df = pd.DataFrame({
    "step"             : np.random.randint(1, 743, N_LEGIT),
    "type"             : legit_types,
    "amount"           : legit_amounts.round(2),
    "nameOrig"         : account_ids("C", N_LEGIT),
    "oldbalanceOrg"    : legit_old_org.round(2),
    "newbalanceOrig"   : legit_new_org.round(2),
    "nameDest"         : account_ids("C", N_LEGIT),
    "oldbalanceDest"   : legit_old_dst.round(2),
    "newbalanceDest"   : legit_new_dst.round(2),
    "isFraud"          : 0,
    "isFlaggedFraud"   : 0,
})

# ── FRAUDULENT transactions ──────────────────────────────────
# Fraud pattern: large TRANSFER or CASH_OUT that drains the account
print("[3/4] Building fraudulent transactions...")
fraud_types   = np.random.choice(["TRANSFER", "CASH_OUT"], N_FRAUD,
                  p=[0.55, 0.45])
fraud_old_org = np.abs(np.random.lognormal(mean=11.5, sigma=1.2, size=N_FRAUD))
# Fraud drains 70-100% of the balance
drain_pct     = np.random.uniform(0.70, 1.00, N_FRAUD)
fraud_amounts = (fraud_old_org * drain_pct).clip(100, 2_000_000).round(2)
fraud_new_org = np.zeros(N_FRAUD)   # account emptied
fraud_old_dst = np.abs(np.random.lognormal(mean=5.0, sigma=2.0, size=N_FRAUD))
fraud_new_dst = fraud_old_dst + fraud_amounts

fraud_df = pd.DataFrame({
    "step"             : np.random.randint(1, 743, N_FRAUD),
    "type"             : fraud_types,
    "amount"           : fraud_amounts,
    "nameOrig"         : account_ids("C", N_FRAUD),
    "oldbalanceOrg"    : fraud_old_org.round(2),
    "newbalanceOrig"   : fraud_new_org.round(2),
    "nameDest"         : account_ids("M", N_FRAUD),   # merchants = money mules
    "oldbalanceDest"   : fraud_old_dst.round(2),
    "newbalanceDest"   : fraud_new_dst.round(2),
    "isFraud"          : 1,
    "isFlaggedFraud"   : np.random.choice([0, 1], N_FRAUD, p=[0.7, 0.3]),
})

# ── Combine and shuffle ──────────────────────────────────────
df = pd.concat([legit_df, fraud_df], ignore_index=True)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

os.makedirs("dataset", exist_ok=True)
out_path = os.path.join("dataset", "paysim.csv")
df.to_csv(out_path, index=False)

print(f"[4/4] Saved {len(df):,} rows -> {out_path}")
print(f"      Fraud rows : {df['isFraud'].sum():,} ({df['isFraud'].mean()*100:.1f}%)")
print(f"      Legit rows : {(df['isFraud']==0).sum():,}")
print("      Columns    :", list(df.columns))
print("\n✅  Demo dataset ready!\n")
