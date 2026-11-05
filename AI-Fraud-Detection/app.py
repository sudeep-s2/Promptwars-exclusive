# =============================================================================
# app.py
# AI Fraud Detection System — Streamlit Frontend
#
# Three modules accessible from the sidebar:
#   1. Dashboard     — overview metrics, charts, transaction history
#   2. Test Transaction — manual single-transaction scorer
#   3. Live Simulation  — batch random transaction scoring with live chart
# =============================================================================

import time
import random
import warnings
import numpy as np
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# PAGE CONFIG — must be the FIRST Streamlit call
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="AI-Powered Fraud Detection System",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# IMPORT FRAUD ENGINE
# We wrap this in a try/except so the UI still loads even if models are missing
# (the user sees a friendly message rather than a raw traceback).
# ---------------------------------------------------------------------------
try:
    from fraud_engine import predict_transaction, _MODELS_LOADED, _CONFIG
    MODELS_READY = _MODELS_LOADED
    if MODELS_READY:
        RF_THRESHOLD = _CONFIG.get("rf_threshold", 0.50)
    else:
        RF_THRESHOLD = 0.50
except Exception as import_err:
    MODELS_READY = False
    RF_THRESHOLD = 0.50
    st.error(f"Could not import fraud_engine: {import_err}")

# ---------------------------------------------------------------------------
# SESSION STATE — persists across reruns within the same browser session
# ---------------------------------------------------------------------------
if "history" not in st.session_state:
    st.session_state.history = []   # list of result dicts

# ---------------------------------------------------------------------------
# HELPER: status -> colour mapping
# ---------------------------------------------------------------------------
def status_color(status: str) -> str:
    if status.startswith("HIGH"):
        return "🔴"
    elif status.startswith("MEDIUM"):
        return "🟡"
    else:
        return "🟢"

def status_to_category(status: str) -> str:
    """Collapse status into 3 chart-friendly categories."""
    if status.startswith("HIGH"):
        return "High Risk"
    elif status.startswith("MEDIUM"):
        return "Medium Risk"
    else:
        return "Low Risk"

# ---------------------------------------------------------------------------
# SIDEBAR — navigation + model status
# ---------------------------------------------------------------------------
with st.sidebar:
    st.image(
        "https://img.icons8.com/fluency/96/shield.png",
        width=80,
    )
    st.title("🛡️ Fraud Detection")
    st.markdown("---")

    page = st.radio(
        "Navigate",
        ["📊 Dashboard", "🔍 Test Transaction", "⚡ Live Simulation"],
        label_visibility="collapsed",
    )

    st.markdown("---")
    if MODELS_READY:
        st.success("✅ Models loaded")
        st.caption(f"RF Threshold: **{RF_THRESHOLD:.4f}**")
    else:
        st.error("❌ Models not found\nRun `python train_model.py` first.")

    st.markdown("---")
    st.caption("PaySim Synthetic Dataset\nFor demo purposes only.")

# ---------------------------------------------------------------------------
# PAGE 1 — DASHBOARD
# ---------------------------------------------------------------------------
if page == "📊 Dashboard":
    st.title("📊 Fraud Detection Dashboard")

    history = st.session_state.history

    # --- Metrics row ---
    col1, col2, col3, col4 = st.columns(4)

    total       = len(history)
    suspicious  = sum(1 for h in history
                      if h["status"].startswith("HIGH") or h["status"].startswith("MEDIUM"))
    approved    = sum(1 for h in history if h["status"].startswith("LOW"))
    high_risk   = sum(1 for h in history if h["status"].startswith("HIGH"))

    col1.metric("📋 Total Transactions", total)
    col2.metric("⚠️ Suspicious",         suspicious,
                delta=f"{suspicious/total*100:.1f}%" if total else "—",
                delta_color="inverse")
    col3.metric("✅ Approved",            approved)
    col4.metric("🔴 High Risk",           high_risk,
                delta_color="inverse")

    st.markdown("---")

    if not history:
        st.info("💡 No transactions scored yet. "
                "Go to **Test Transaction** or **Live Simulation** to get started.")
        st.stop()

    # Build a display DataFrame
    df_hist = pd.DataFrame(history)
    df_hist["Category"]    = df_hist["status"].apply(status_to_category)
    df_hist["Risk Icon"]   = df_hist["status"].apply(status_color)
    df_hist["Prob (%)"]    = df_hist["fraud_probability"]
    df_hist["Anomaly"]     = df_hist["anomaly"].map({True: "Yes", False: "No"})

    # --- Risk distribution chart ---
    col_chart, col_table = st.columns([1, 1])

    with col_chart:
        st.subheader("Risk Distribution")
        counts = df_hist["Category"].value_counts().reset_index()
        counts.columns = ["Risk Level", "Count"]
        color_map = {
            "High Risk"  : "#EF4444",
            "Medium Risk": "#F59E0B",
            "Low Risk"   : "#10B981",
        }
        fig_pie = px.pie(
            counts,
            names="Risk Level",
            values="Count",
            color="Risk Level",
            color_discrete_map=color_map,
            hole=0.4,
        )
        fig_pie.update_layout(margin=dict(t=20, b=20), height=320)
        st.plotly_chart(fig_pie, use_container_width=True)

    with col_table:
        st.subheader("Recent Transactions")
        display_cols = ["Risk Icon", "status", "Prob (%)", "Anomaly", "action"]
        # Show the last 20 transactions (most recent first)
        st.dataframe(
            df_hist[display_cols].tail(20).iloc[::-1].reset_index(drop=True),
            use_container_width=True,
            height=320,
        )

    # --- Probability trend line chart ---
    st.markdown("---")
    st.subheader("Fraud Probability Over Time")
    df_hist["Transaction #"] = range(1, len(df_hist) + 1)
    fig_line = px.line(
        df_hist,
        x="Transaction #",
        y="Prob (%)",
        color="Category",
        color_discrete_map=color_map,
        markers=True,
        labels={"Prob (%)": "Fraud Probability (%)"},
    )
    fig_line.add_hline(y=80, line_dash="dash", line_color="red",
                       annotation_text="High Risk Threshold (80%)")
    fig_line.add_hline(y=30, line_dash="dash", line_color="orange",
                       annotation_text="Medium Risk Threshold (30%)")
    fig_line.update_layout(height=350)
    st.plotly_chart(fig_line, use_container_width=True)

    # --- Color-coded transaction list ---
    st.markdown("---")
    st.subheader("Detailed Transaction Log")
    for i, h in enumerate(reversed(history[-30:])):
        icon  = status_color(h["status"])
        color = "#FEE2E2" if h["status"].startswith("HIGH") else \
                "#FEF9C3" if h["status"].startswith("MEDIUM") else "#D1FAE5"

        with st.expander(
            f"{icon} #{total - i}  |  {h['status']}  |  "
            f"Prob: {h['fraud_probability']}%  |  Anomaly: {h['anomaly']}"
        ):
            c1, c2 = st.columns(2)
            c1.write(f"**Action:** {h['action']}")
            c1.write(f"**Anomaly Score:** {h['anomaly_score']}")
            c2.write("**Reasons:**")
            for r in h.get("reasons", []):
                c2.write(f"• {r}")

# ---------------------------------------------------------------------------
# PAGE 2 — TEST TRANSACTION
# ---------------------------------------------------------------------------
elif page == "🔍 Test Transaction":
    st.title("🔍 Test a Transaction")

    if not MODELS_READY:
        st.error("⚠️ Models are not loaded. Run `python train_model.py` first.")
        st.stop()

    st.markdown(
        "Enter transaction details below and click **Analyze** to get "
        "an instant risk assessment."
    )
    st.markdown("---")

    # --- Benchmark Scenario Quick-Fill buttons ---
    st.subheader("Quick Demo Scenarios")
    s_col1, s_col2, s_col3 = st.columns(3)

    # We use session state flags to pre-fill the form
    if "prefill" not in st.session_state:
        st.session_state.prefill = None

    if s_col1.button("🟢 Normal Payment"):
        st.session_state.prefill = "normal"
    if s_col2.button("🔴 Suspicious Transfer"):
        st.session_state.prefill = "suspicious"
    if s_col3.button("💼 Genuine High-Value"):
        st.session_state.prefill = "highvalue"

    # Set default values based on prefill selection
    pf = st.session_state.prefill
    defaults = {
        "amount"      : 80000  if pf == "highvalue" else (90000 if pf == "suspicious" else 500),
        "tx_type"     : "TRANSFER" if pf in ("suspicious", "highvalue") else "PAYMENT",
        "old_bal"     : 200000 if pf == "highvalue" else (100000 if pf == "suspicious" else 10000),
        "new_bal"     : 120000 if pf == "highvalue" else (10000  if pf == "suspicious" else 9500),
        "dest_old"    : 0,
        "dest_new"    : 0,
        "cust_avg"    : 90000  if pf == "highvalue" else 2000,
        "familiar"    : pf != "suspicious",
    }

    st.markdown("---")

    # --- Input form ---
    with st.form("transaction_form"):
        col1, col2 = st.columns(2)

        with col1:
            amount = st.number_input(
                "Transaction Amount ($)",
                min_value=0.0,
                value=float(defaults["amount"]),
                step=100.0,
                help="The dollar value being transferred or paid",
            )
            tx_type = st.selectbox(
                "Transaction Type",
                ["PAYMENT", "TRANSFER", "CASH_OUT", "CASH_IN", "DEBIT"],
                index=["PAYMENT","TRANSFER","CASH_OUT","CASH_IN","DEBIT"].index(defaults["tx_type"]),
            )
            old_balance = st.number_input(
                "Sender's Balance BEFORE ($)",
                min_value=0.0,
                value=float(defaults["old_bal"]),
                step=1000.0,
            )
            new_balance = st.number_input(
                "Sender's Balance AFTER ($)",
                min_value=0.0,
                value=float(defaults["new_bal"]),
                step=1000.0,
                help="Accepted for realism but not fed to the model (leakage prevention)",
            )

        with col2:
            dest_old = st.number_input(
                "Destination Balance BEFORE ($)",
                min_value=0.0,
                value=float(defaults["dest_old"]),
                step=1000.0,
            )
            dest_new = st.number_input(
                "Destination Balance AFTER ($)",
                min_value=0.0,
                value=float(defaults["dest_new"]),
                step=1000.0,
                help="Accepted for realism but not fed to the model (leakage prevention)",
            )
            cust_avg = st.number_input(
                "Customer Typical Transaction Amount ($)",
                min_value=0.0,
                value=float(defaults["cust_avg"]),
                step=100.0,
                help="Customer's historical average. Leave 0 if unknown.",
            )
            familiar = st.checkbox(
                "Familiar customer transaction pattern",
                value=bool(defaults["familiar"]),
                help="Check if this transaction matches the customer's known behaviour",
            )

        submitted = st.form_submit_button("🔍 Analyze Transaction", use_container_width=True)

    # --- Run prediction ---
    if submitted:
        with st.spinner("Analyzing transaction..."):
            try:
                result = predict_transaction(
                    amount                  = amount,
                    transaction_type        = tx_type,
                    old_balance             = old_balance,
                    new_balance             = new_balance,
                    destination_old_balance = dest_old,
                    destination_new_balance = dest_new,
                    customer_avg_amount     = cust_avg if cust_avg > 0 else None,
                    familiar_pattern        = familiar,
                )

                # Save to history
                st.session_state.history.append(result)

            except Exception as e:
                st.error(f"❌ Prediction failed: {e}")
                st.stop()

        st.markdown("---")
        st.subheader("📋 Risk Assessment Result")

        # Choose display style based on risk
        status = result["status"]
        if status.startswith("HIGH"):
            st.error(f"🔴 **{status}** — {result['action']}")
        elif status.startswith("MEDIUM"):
            st.warning(f"🟡 **{status}** — {result['action']}")
        else:
            st.success(f"🟢 **{status}** — {result['action']}")

        # Metrics row
        m1, m2, m3 = st.columns(3)
        m1.metric("Fraud Probability", f"{result['fraud_probability']}%")
        m2.metric("Statistical Anomaly", "YES" if result["anomaly"] else "NO")
        m3.metric("Anomaly Score", f"{result['anomaly_score']}")

        # Gauge chart for fraud probability
        fig_gauge = go.Figure(go.Indicator(
            mode  = "gauge+number",
            value = result["fraud_probability"],
            title = {"text": "Fraud Probability (%)"},
            gauge = {
                "axis" : {"range": [0, 100]},
                "bar"  : {"color": "darkred"},
                "steps": [
                    {"range": [0, 30],  "color": "#D1FAE5"},
                    {"range": [30, 80], "color": "#FEF9C3"},
                    {"range": [80, 100],"color": "#FEE2E2"},
                ],
                "threshold": {
                    "line" : {"color": "red", "width": 4},
                    "thickness": 0.75,
                    "value": 80,
                },
            },
            number={"suffix": "%"},
        ))
        fig_gauge.update_layout(height=280, margin=dict(t=40, b=20))
        st.plotly_chart(fig_gauge, use_container_width=True)

        # Reasons
        st.subheader("💡 Explanation")
        for reason in result["reasons"]:
            st.write(f"• {reason}")

# ---------------------------------------------------------------------------
# PAGE 3 — LIVE SIMULATION
# ---------------------------------------------------------------------------
elif page == "⚡ Live Simulation":
    st.title("⚡ Live Transaction Simulation")

    if not MODELS_READY:
        st.error("⚠️ Models are not loaded. Run `python train_model.py` first.")
        st.stop()

    st.markdown(
        "Simulate a stream of random transactions. The system scores each one "
        "in real-time and updates the dashboard live."
    )

    col_a, col_b, col_c = st.columns(3)
    n_transactions = col_a.slider("Number of transactions", 5, 100, 20)
    delay_ms       = col_b.slider("Delay between transactions (ms)", 50, 500, 150)
    fraud_mix      = col_c.slider("Suspicious transaction mix (%)", 0, 60, 20)

    start_btn = st.button("▶️ Start Simulation", use_container_width=True)

    if start_btn:
        # Placeholders for live-updating elements
        status_placeholder  = st.empty()
        table_placeholder   = st.empty()
        chart_placeholder   = st.empty()

        sim_results = []

        # -------------------------------------------------------------------
        # Transaction generator — creates plausible random transactions
        # -------------------------------------------------------------------
        TYPES = ["PAYMENT", "TRANSFER", "CASH_OUT", "CASH_IN", "DEBIT"]

        def _generate_transaction(is_suspicious: bool) -> dict:
            """Generate one random transaction dict for scoring."""
            if is_suspicious:
                # Suspicious: large amount, TRANSFER or CASH_OUT
                tx_type    = random.choice(["TRANSFER", "CASH_OUT"])
                old_bal    = random.uniform(50_000, 500_000)
                amount     = random.uniform(old_bal * 0.7, old_bal)  # drains account
                cust_avg   = random.uniform(500, 5_000)              # low avg for them
                familiar   = False
            else:
                # Normal: modest amount, varied type
                tx_type    = random.choice(TYPES)
                old_bal    = random.uniform(1_000, 50_000)
                amount     = random.uniform(100, min(old_bal, 5_000))
                cust_avg   = random.uniform(amount * 0.5, amount * 2)
                familiar   = random.random() > 0.2  # 80% chance familiar

            new_bal  = max(0, old_bal - amount)
            dest_old = random.uniform(0, 20_000)
            dest_new = dest_old + amount

            return dict(
                amount                  = round(amount, 2),
                transaction_type        = tx_type,
                old_balance             = round(old_bal, 2),
                new_balance             = round(new_bal, 2),
                destination_old_balance = round(dest_old, 2),
                destination_new_balance = round(dest_new, 2),
                customer_avg_amount     = round(cust_avg, 2),
                familiar_pattern        = familiar,
            )

        # -------------------------------------------------------------------
        # Scoring loop
        # -------------------------------------------------------------------
        color_map = {
            "High Risk"  : "#EF4444",
            "Medium Risk": "#F59E0B",
            "Low Risk"   : "#10B981",
        }

        for i in range(n_transactions):
            is_susp  = random.random() < (fraud_mix / 100)
            tx_input = _generate_transaction(is_susp)

            status_placeholder.info(
                f"⏳ Scoring transaction {i+1} / {n_transactions}  "
                f"| Amount: ${tx_input['amount']:,.0f}  "
                f"| Type: {tx_input['transaction_type']}"
            )

            try:
                result = predict_transaction(**tx_input)
            except Exception as e:
                st.error(f"Scoring error: {e}")
                break

            # Merge input metadata into result for display
            result["amount"]   = tx_input["amount"]
            result["type"]     = tx_input["transaction_type"]
            result["category"] = status_to_category(result["status"])

            sim_results.append(result)
            st.session_state.history.append(result)

            # --- Live table ---
            df_sim = pd.DataFrame(sim_results)
            table_placeholder.dataframe(
                df_sim[["type","amount","status","fraud_probability","anomaly","action"]]
                .iloc[::-1]
                .reset_index(drop=True),
                use_container_width=True,
                height=min(400, 35 * len(sim_results) + 38),
            )

            # --- Live chart ---
            df_sim["#"] = range(1, len(sim_results) + 1)
            fig_live = px.bar(
                df_sim,
                x="#",
                y="fraud_probability",
                color="category",
                color_discrete_map=color_map,
                labels={"fraud_probability": "Fraud Prob (%)", "#": "Transaction #"},
                title="Live Fraud Probability",
            )
            fig_live.add_hline(y=80, line_dash="dash", line_color="red")
            fig_live.add_hline(y=30, line_dash="dash", line_color="orange")
            fig_live.update_layout(height=350, showlegend=True)
            chart_placeholder.plotly_chart(fig_live, use_container_width=True)

            # Delay between transactions
            time.sleep(delay_ms / 1000)

        # --- Final summary ---
        status_placeholder.empty()
        df_final = pd.DataFrame(sim_results)
        counts   = df_final["category"].value_counts()

        st.success(f"✅ Simulation complete — {n_transactions} transactions scored.")
        s1, s2, s3 = st.columns(3)
        s1.metric("🔴 High Risk",   counts.get("High Risk",   0))
        s2.metric("🟡 Medium Risk", counts.get("Medium Risk", 0))
        s3.metric("🟢 Low Risk",    counts.get("Low Risk",    0))

        st.markdown("---")
        st.subheader("Simulation Risk Summary")
        fig_summary = px.pie(
            df_final,
            names="category",
            color="category",
            color_discrete_map=color_map,
            hole=0.35,
            title="Risk Distribution After Simulation",
        )
        st.plotly_chart(fig_summary, use_container_width=True)
