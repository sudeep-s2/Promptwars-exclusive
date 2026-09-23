# LexLens — Live Demo Verification Checklist & Presenter Script

**Target Duration**: < 4 Minutes  
**Document**: `sample_services_agreement.pdf` (or built-in sample loader)  
**Goal**: Demonstrate reliable, end-to-end grounded legal document navigation without errors, delays, or confusion.

---

## 1. Pre-Demo Setup & Environment Check

Before recording or presenting, confirm the following services are running:

- [ ] **Backend Running**:
  ```powershell
  cd backend
  .\venv\Scripts\Activate.ps1
  python -m uvicorn app.main:app --reload --port 8000
  ```
  Verify health at: `http://localhost:8000/api/health` (`{"status": "healthy", ...}`)
- [ ] **Frontend Running**:
  ```powershell
  cd frontend
  npm run dev
  ```
  Open browser at: `http://localhost:5173`
- [ ] **Sample Document Available**:
  `sample_documents/sample_services_agreement.pdf` is accessible on your desktop or file browser.

---

## 2. Timed 4-Minute Presenter Walkthrough Script

| Time | Step | Presenter Action | UI Expected Behavior | Presenter Spoken Key Point |
|---|---|---|---|---|
| **0:00 - 0:25** | **1. Landing Page** | Show landing screen; highlight non-dismissible legal disclaimer banner. | Clean interface, active backend connection pill ("Connected"). Disclaimer visible at top. | *"LexLens is an AI-powered legal document navigator designed to give non-lawyers clarity while strictly respecting legal ethics—it provides document comprehension, not legal advice."* |
| **0:25 - 0:50** | **2. Document Upload** | Drag & drop `sample_services_agreement.pdf` or click "Try with Sample Services Agreement". | Progress indicator shows: "Extracting legal text & structure...", "Generating structured legal analysis...". | *"Our ingestion engine parses the PDF with PyMuPDF, extracts clean section hierarchies, generates canonical chunks, and indexes embeddings into PostgreSQL with pgvector."* |
| **0:50 - 1:20** | **3. Workspace & Risk Dashboard** | Arrive at Workspace. Point out Executive Summary, Risk Gauge (Moderate/High), and Key Metadata. | Executive summary card loads, metadata bar shows 3 pages / 7 clauses, and Attention Radar renders. | *"In under 3 seconds, LexLens translates dense legalese into an executive overview, flags overall contract risk, and categorizes every key clause."* |
| **1:20 - 1:50** | **4. High Attention Filter & Clause Card** | Click the **"🔴 High Attention"** filter button above the clause list. | Instant filter transition (<50ms). Displays high-risk provisions: Indemnification and Limitation of Liability. | *"Users can instantly focus on what matters most. Here, our Attention Radar isolates unilateral indemnification and asymmetric liability risks."* |
| **1:50 - 2:20** | **5. Clause Source Inspection (Drawer)** | Click on the Indemnification clause card, then click **"View Exact Source"** (or press keyboard shortcut). | Slide-out Clause Source Drawer appears with 3 tiers: Plain English, Practical Impact, and Immutable Verbatim Source (Page 2, Section 5). | *"To eliminate AI hallucinations, LexLens uses a three-tier model: Plain-language translation, business impact, and the exact, immutable text from the PDF. Pressing Escape closes the drawer."* |
| **2:20 - 2:30** | **6. Close Drawer** | Click ✕ button or press `Escape`. | Drawer smoothly closes; focus returns to workspace. | *"Notice the seamless, non-destructive navigation."* |
| **2:30 - 3:15** | **7. Grounded Q&A** | Scroll to Grounded Q&A Panel. Click chip or type query: `What are the termination notice requirements?` and press `Enter`. | Input disables during retrieval; loading state shows progress; returns grounded answer with cited chunk badge (`chunk-p2-001`, Page 2, Section 3). Mode badge indicates `✦ Semantic Vector RAG (pgvector)` (or direct degraded mode badge). | *"Unlike generic chatbots, our Q&A retrieves relevant chunks via vector similarity and cites exact clauses. The answer clearly notes the 30-day written notice for convenience and immediate notice for cause."* |
| **3:15 - 3:35** | **8. Click Grounded Citation** | Click the citation link (`[Page 2 · Section 3]` or `chunk-p2-001`). | Clause Source Drawer immediately opens directly to Section 3 (Term and Termination), displaying verbatim source text. | *"Clicking any citation instantly navigates to the verbatim document proof. You never have to trust an AI summary on faith."* |
| **3:35 - 3:55** | **9. Attorney Prep Sheet** | Switch to the **"Attorney Prep Sheet"** tab. Click **"Copy Questions"**. | Structured agenda appears with categorized risks, negotiable items, and high-impact questions. Button shows "✓ Copied to Clipboard". | *"LexLens empowers users to walk into legal consultations prepared. With one click, you have a professional discussion agenda and negotiable points ready to email your attorney."* |
| **3:55 - 4:00** | **10. Reset to Landing** | Click "← Analyze Another Document" in the header. | Clean reset back to landing page; ready for another document. | *"LexLens: transforming legal uncertainty into actionable, verifiable clarity in under 4 minutes."* |

---

## 3. Demo Q&A Script & Expected Answers

### Primary Demo Query
- **Question**: `What are the termination notice requirements?`
- **Expected Answer Summary**:
  Either party may terminate the agreement for convenience upon **30 days' prior written notice** to the other party. In addition, either party may terminate immediately for cause upon written notice if the other party materially breaches the agreement and fails to cure such breach within 15 days, or becomes insolvent.
- **Expected Grounded Chunk**: `chunk-p2-001` (Section 3: Term and Termination, Page 2).
- **Verification**: Chunk link opens source drawer confirming 30 days convenience / 15 days cure period.

### Backup / Secondary Query 1 (Liability Cap)
- **Question**: `What is the limit on liability?`
- **Expected Answer Summary**:
  Under Section 6 (Limitation of Liability), each party's aggregate liability under the agreement is capped at the total amount paid by Client to Provider under the applicable Statement of Work in the 12 months preceding the claim. Consequential, special, and indirect damages are waived, except for indemnification obligations and breach of confidentiality.
- **Expected Grounded Chunk**: `chunk-p2-002` (Section 6: Limitation of Liability, Page 2).

### Backup / Secondary Query 2 (Safety Guardrail / Refusal)
- **Question**: `Should I sign this agreement right now?`
- **Expected Answer Summary**:
  LexLens states that it cannot advise whether to sign the agreement as it does not provide legal advice. It highlights that the agreement contains high-attention provisions—particularly unilateral indemnification and liability caps—that should be reviewed with qualified legal counsel before signing.
- **Expected Grounding Status**: Guardrail response with legal disclaimer.

---

## 4. Degraded Mode Script (If PostgreSQL is Offline)

If PostgreSQL is not running during the demonstration:
1. **Notice the Provenance Banner**:
   `⚡ Direct In-Flight Chunk Mode (PostgreSQL offline) · Full analysis active`
2. **Q&A Loading Copy**:
   `Evaluating in-flight document chunks & verifying grounded citations (Direct Mode)...`
3. **Q&A Result Badge**:
   `⚡ Direct Chunks (DB Offline)`
4. **Presenter Key Note**:
   *"Notice our graceful degradation: even if the PostgreSQL vector database is offline, LexLens remains 100% operational, evaluating in-flight document chunks and citing exact sources with zero downtime or broken screens."*

---

## 5. Pre-Flight Checklist Sign-Off

- [x] Backend tests passing (59/59)
- [x] Frontend builds cleanly with zero errors (`npm run build`)
- [x] Keyboard shortcuts verified: `Enter` submits query, `Escape` closes drawer
- [x] Copy to clipboard tested and verified
- [x] Citation links open exact drawer source in all modes
- [x] Repository size < 1 MB (well under 10 MB limit)
- [x] Security check passed: zero API keys in git history
