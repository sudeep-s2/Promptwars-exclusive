# LexLens — Phase 1: Product Definition, Complete Vision & MVP Specification

**Document Version**: 1.0.0  
**Status**: Approved Product Specification  
**System**: LexLens (PromptWars Exclusive Edition)  
**Author**: LexLens Product & Engineering Team  

---

## 1. Product Definition & Strategic Positioning

### Product Name
**LexLens** (*The Legal Document Information Assistant*)

### One-Sentence Description
> **LexLens** is a GenAI-powered legal document navigator that translates dense contracts into plain-English commitments, highlights critical clauses and obligations with verbatim source proof, and compiles an actionable counsel consultation prep sheet.

### Target Users
- **Primary User**: Freelance professionals, solo contractors, and small business owners (agencies, consultants, startups) reviewing inbound client agreements, vendor MSAs, or supplier contracts without immediate, affordable access to full-time legal counsel.
- **Secondary Users**: Residential tenants reviewing complex property leases; employees evaluating non-disclosure, IP assignment, or offer letter addenda.

### Core Problem
Non-lawyers are routinely compelled to sign legally binding instruments they cannot understand because:
1. Archaic legal jargon and convoluted sentence structures mask extreme personal liability.
2. Users lack the legal training to know *which* specific clauses require pushback or negotiation.
3. Private legal consultation is prohibitively expensive ($300–$600/hr) for routine contracts.

### Job-To-Be-Done (JTBD)
> *"When I receive an inbound contract that I am expected to sign, I want to quickly identify my financial obligations, critical liabilities, and hidden pitfalls in plain English, so that I can either negotiate terms with confidence or bring a focused, high-leverage list of questions to my attorney."*

### Product Promise
LexLens guarantees **uncompromising source-grounding**: every translation, highlighted obligation, and answer is strictly tied to a verbatim excerpt from the user's uploaded document. LexLens makes contracts intelligible without giving unauthorized legal advice.

### What LexLens DOES
- Parses and cleans uploaded PDF contracts in-memory.
- Surfaces an **Executive Summary** and structured **Attention Radar** (Financial Terms, Obligations, Liabilities, Termination Triggers).
- Translates complex legalese into 8th-grade reading level plain English while displaying original text side-by-side.
- Answers user questions strictly grounded in document context with direct page and paragraph citations.
- Generates a downloadable **Attorney Consultation Prep Sheet & Action Checklist** containing targeted questions to ask legal counsel.

### What LexLens Explicitly DOES NOT Do
- It does **not** provide legal advice, legal opinions, or recommendations on whether to sign or breach a contract.
- It does **not** declare clauses "legally binding," "illegal," or "enforceable" under specific state or federal case law.
- It does **not** represent users in disputes or act as an attorney-in-fact.
- It does **not** replace the judgment of a licensed legal practitioner.

---

## 2. Complete Product Vision (North Star)

In its mature form, LexLens is an **End-to-End Legal Enablement Platform** for individuals and growing businesses:

```
+---------------------------------------------------------------------------------------+
|                                LexLens Product Vision                                 |
|                                                                                       |
|  [Ingestion & OCR]       [Intelligence Engine]        [Action & Negotiation]          |
|  - Multi-format PDFs     - Section-Aware Chunking     - Attorney Prep Sheet Export    |
|  - Scanned Doc OCR       - Risk & Attention Radar     - Plain-English Counter-Proposals|
|  - Cloud Storage Sync    - Multi-Doc Redline Diff     - Clause Benchmark Database     |
|                          - Grounded Legal RAG         - E-Signature Hand-Off          |
+---------------------------------------------------------------------------------------+
```

### Complete Vision Capabilities
1. **Multi-Document Redlining & Version Diffing**: Comparing inbound drafts against company playbooks or standard templates to highlight subtle wording drift.
2. **Dynamic Jurisdiction Adapter**: Flagging clauses that conflict with known statutory baselines (e.g. state-specific security deposit ceilings).
3. **Interactive Counter-Proposal Drafter**: Providing neutral, plain-language wording alternatives for oppressive clauses to paste into email negotiations.
4. **Team Collaboration & Annotation**: Allowing multiple stakeholders to tag clauses, leave internal notes, and assign review items.

---

## 3. MVP Scope Definition

To ensure high reliability, impeccable source grounding, and a crisp <4-minute demonstration, the MVP is strictly scoped to **4 core capabilities**:

```
+-----------------------------------------------------------------------------+
|                                LexLens MVP                                  |
|                                                                             |
|  +---------------------+  +---------------------+  +---------------------+  |
|  | 1. Executive Summary|  | 2. Attention Radar  |  | 3. Grounded Q&A     |  |
|  |    & Overview Card  |  |    & Clause Cards   |  |    with Citations   |  |
|  +---------------------+  +---------------------+  +---------------------+  |
|                                     |                                       |
|                                     v                                       |
|                       +---------------------------+                         |
|                       | 4. Counsel Prep Checklist |                         |
|                       |    & Export Sheet         |                         |
|                       +---------------------------+                         |
+-----------------------------------------------------------------------------+
```

### The 4 Core MVP Capabilities

#### 1. Document Overview & Executive Summary
- **User Problem Solved**: Eliminates cognitive paralysis when opening a 20-page document.
- **User Action**: Uploads a PDF contract via drag-and-drop.
- **Backend Action**: Extracts pages via PyMuPDF, cleans text, and segments into section-aware chunks.
- **AI Action**: Synthesizes a high-level executive summary: Parties, Document Purpose, Term/Duration, and Financial Summary.
- **Output**: Clean top-level summary card with key contract metadata.
- **Why in MVP**: Sets foundational context before diving into individual clauses.

#### 2. Clause Attention Radar (Plain-English Decoder)
- **User Problem Solved**: Users don't know where the traps are hidden in dense text.
- **User Action**: Clicks on categorized finding pills (*"High Attention: Unlimited Indemnification"* or *"Payment: Net 60"*).
- **Backend Action**: Retrieves corresponding document chunk with exact page reference.
- **AI Action**: Formats finding into a 3-part card:
  1. *What It Means*: Plain-English explanation.
  2. *Why It Matters*: Practical implication for the user.
  3. *Verbatim Excerpt*: Exact quoted sentence from the document.
- **Output**: Interactive card with expandable original source text drawer.
- **Why in MVP**: Core differentiator from generic chatbots; delivers instant "aha!" value.

#### 3. Grounded Legal Q&A with Verbatim Proof
- **User Problem Solved**: Specific user anxieties (*"Can they fire me without notice?"* or *"Who owns the source code?"*).
- **User Action**: Types a question into the document chat panel.
- **Backend Action**: Retrieves most relevant chunks via semantic search.
- **AI Action**: Synthesizes direct answer strictly bounded to retrieved chunks, appending `[Page X, Section Y]` citations. If text does not contain the answer, explicitly states: *"The uploaded document does not contain terms addressing this question."*
- **Output**: Conversational answer with clickable citation pills highlighting the exact source passage.
- **Why in MVP**: Provides dynamic exploration beyond static summaries while grounding answers strictly in retrieved document content and displaying source excerpts for verification to minimize unsupported responses.

#### 4. Counsel Prep Sheet & Actionable Checklist
- **User Problem Solved**: Users don't know how to talk to a lawyer or what questions to ask.
- **User Action**: Clicks *"Generate Counsel Prep Sheet"*.
- **Backend Action**: Packages document metadata and flagged high-attention clauses.
- **AI Action**: Generates a structured list of 4–6 strategic, professional questions to ask an attorney.
- **Output**: Clean exportable checklist modal with print/copy capability.
- **Why in MVP**: Anchors the legal safety posture; directly fulfills the PromptWars requirement to *"help users prepare questions for a legal professional"*.

---

### Scope Boundary Table

| Feature Category | In MVP | Later (Phase 3+) | Not Needed / Out of Scope |
| :--- | :---: | :---: | :---: |
| **PDF Upload & Validation (<=10 MB)** | **YES** | — | — |
| **Page-by-Page PyMuPDF Extraction** | **YES** | — | — |
| **Section-Aware Chunking** | **YES** | — | — |
| **Executive Summary Generation** | **YES** | — | — |
| **Categorized Clause Attention Radar** | **YES** | — | — |
| **Bidirectional Verbatim Source Grounding** | **YES** | — | — |
| **Document-Grounded Q&A with Citations** | **YES** | — | — |
| **Attorney Consultation Prep Sheet Export** | **YES** | — | — |
| **Scanned Image OCR Parsing** | — | YES | — |
| **DOCX / Word File Ingestion** | — | YES | — |
| **Multi-Contract Redline Comparison** | — | YES | — |
| **User Authentication & Accounts** | — | YES | — |
| **PostgreSQL / Vector DB Persistent Storage** | — | YES | — |
| **E-Signature Integration (DocuSign)** | — | — | **NEVER** |
| **Automated Legal Representation / Advice** | — | — | **NEVER (Prohibited)** |
| **Unsupervised Contract Execution** | — | — | **NEVER** |

---

## 4. Primary User Journey & Information Flow

```
[ 1. Landing ]  -->  [ 2. Drop PDF ]  -->  [ 3. In-Memory Processing ]
                             |
                             v
                     [ 4. Dashboard View ]
        +--------------------+---------------------+
        |                                          |
        v                                          v
[ Executive Summary & Radar ]              [ Grounded Q&A Panel ]
        |                                          |
        v                                          v
[ Click Attention Card ]                   [ Ask: "Termination notice?" ]
        |                                          |
        v                                          v
[ Drawer: Plain English + Source ]         [ Answer + [Page 2, Sec 3] ]
        \                                          /
         --------------------+---------------------
                             |
                             v
              [ 5. Export Counsel Prep Sheet ]
```

### Detailed Step-by-Step Flow

#### Step 1: Landing & Upload
- **What User Sees**: Clean landing hero with LexLens branding, prominent legal disclaimer banner, and active drag-and-drop zone.
- **What User Does**: Drops a PDF contract (e.g. `sample_services_agreement.pdf`) into the dropzone.
- **Behind the Scenes**: Client checks file type (`.pdf`) and size (`<=10MB`). Sends `POST /api/documents/upload` with `multipart/form-data`.
- **Data Flow**: Browser File Object → FastAPI memory buffer.

#### Step 2: Processing & In-Flight Extraction
- **What User Sees**: Modern animated progress state indicating: *"Extracting text with PyMuPDF... Detecting legal clauses... Generating attention radar..."*
- **Behind the Scenes**:
  - `DocumentProcessor` validates magic bytes `%PDF`.
  - PyMuPDF reads pages, cleans hyphenation wraps, and detects legal headers.
  - Chunking engine yields deterministic chunks.
- **Data Flow**: Binary bytes → Clean `DocumentChunk` array → JSON payload.

#### Step 3: Analysis Dashboard & Attention Radar
- **What User Sees**:
  - **Top**: Executive summary card (Parties, Term, Financial commitments).
  - **Center**: Attention Radar with severity badges:
    - 🔴 **High Attention**: Indemnification with uncapped liability.
    - 🟡 **Moderate**: Automatic 12-month renewal clause.
    - 🟢 **Standard**: Severability and governing law.
- **What User Does**: Clicks on a flagged High Attention card.
- **Behind the Scenes**: UI opens the Clause Inspection Drawer, highlighting the exact chunk and verbatim text.

#### Step 4: Grounded Q&A Interaction
- **What User Sees**: Integrated Q&A drawer with suggested prompt chips: *"What are the payment terms?"*, *"How can this agreement be terminated?"*.
- **What User Does**: Types or clicks a prompt.
- **Behind the Scenes**: Semantic retrieval extracts top-2 matching chunks. GenAI constructs response citing `[Page 2, Section 4]`.
- **Data Flow**: User query + Retrieved Chunks → LLM → Verified Answer with clickable citation pills.

#### Step 5: Actionable Output Generation
- **What User Sees**: *"Attorney Consultation Prep Sheet"* button.
- **What User Does**: Clicks button.
- **Behind the Scenes**: Aggregates flagged clauses and outputs 4 structured questions for an attorney.
- **Output**: Clean printable modal with a one-click *"Copy Prep Sheet"* button.

---

## 5. AI Responsibilities & Specification

The GenAI layer is strictly constrained to specific, deterministic JSON schemas. It is prohibited from free-form open-ended generation.

### AI Task 1: Document Classification & Executive Summary
- **Input**: Extracted text of Page 1 and Page 2 (or preamble and definitions).
- **Task**: Identify document type, parties, effective date, purpose, and financial summary.
- **Structured Schema**:
  ```json
  {
    "document_type": "Master Services Agreement",
    "parties": ["Acme Corp (Client)", "DevStudio LLC (Provider)"],
    "effective_date": "October 1, 2026",
    "duration": "12 months with auto-renewal",
    "financial_summary": "$120/hr, billed monthly, net-30 terms"
  }
  ```
- **Grounding Rule**: Every party name and dollar amount must be verbatim from text.
- **Failure Handling**: If parties cannot be determined, output `"Unspecified in preamble"`.

### AI Task 2: Clause Attention Radar & Plain-Language Translation
- **Input**: Section-aware chunks from `DocumentProcessor`.
- **Task**: Classify chunks into legal categories (Liability, Payment, IP, Termination, Warranties), assign attention level (`High`, `Moderate`, `Standard`), and write a 2-sentence plain English summary.
- **Structured Schema**:
  ```json
  {
    "findings": [
      {
        "category": "Liability & Indemnity",
        "attention_level": "High",
        "title": "Uncapped Third-Party Indemnification",
        "plain_english": "You agree to pay all legal defense costs and damages if someone sues the client over work deliverables, with no dollar limit.",
        "why_it_matters": "A single claim could result in catastrophic financial liability exceeding the total project value.",
        "chunk_id": "chunk-p2-002",
        "verbatim_excerpt": "Provider shall defend and indemnify Client against any third-party claims..."
      }
    ]
  }
  ```
- **Safety Boundary**: Must never use the word "Illegal" or "Invalid." Must use neutral terms like "Uncapped," "One-sided," or "Requires Attention."

### AI Task 3: Grounded Q&A Synthesis
- **Input**: User query string + Top-3 semantically retrieved chunks with page metadata.
- **Task**: Answer user query directly from chunk text.
- **Strict Grounding Rule**: Answer must end with citation `[Page X, Section Y]`. If chunk text does not answer the question, model must reply: *"The uploaded document does not contain language addressing [topic]. Ask your legal counsel to clarify this omission."*

---

## 6. Functional & Non-Functional Requirements

### Functional Requirements (FR)
- **FR-01**: Ingest PDF files up to 10 MB via drag-and-drop or system file picker.
- **FR-02**: Validate file integrity (MIME, extension, and `%PDF` magic bytes) and reject unsupported formats (DOCX, TXT, images) with informative HTTP 415/400 errors.
- **FR-03**: In-flight parsing via PyMuPDF with zero persistent database storage.
- **FR-04**: Section-aware chunking preserving 1-indexed page numbers and detected legal headers.
- **FR-05**: Executive Summary card presenting parties, term, and financial commitments.
- **FR-06**: Attention Radar categorizing clauses by attention severity (`High`, `Moderate`, `Standard`).
- **FR-07**: Interactive split/drawer view displaying plain-English explanation side-by-side with verbatim document text.
- **FR-08**: Grounded Q&A panel returning answers with clickable source citations.
- **FR-09**: Counsel Preparation Sheet generator exportable via clipboard copy or print.

### Non-Functional Requirements (NFR)
- **NFR-01 (Speed)**: In-flight extraction and chunking must complete in `<1.5 seconds` for a standard 10-page PDF.
- **NFR-02 (Reliability)**: 100% deterministic chunk IDs and text integrity; zero loss of characters or altered legal wording during cleaning.
- **NFR-03 (Security)**: Uploaded document bytes reside strictly in memory during request processing and are garbage-collected immediately. No files written to disk.
- **NFR-04 (Type Safety)**: Zero `any` types in TypeScript; 100% Pydantic validation across backend request/response payloads.
- **NFR-05 (Accessibility)**: WCAG 2.1 AA compliant color contrast, full keyboard navigation, and aria attributes on all interactive modals and drawers.

---

## 7. Success Criteria & Demo Plan

### Success Criteria
1. **End-to-End Execution**: A user drops a real 3-page Master Services Agreement and within 3 seconds sees an executive summary, attention radar, and grounded chunks.
2. **Explainability Test**: Every finding can be traced back to the exact line and paragraph of the original text with a single click.
3. **Safety Compliance**: Zero instances of unauthorized legal advice; persistent disclaimers remain visible across all viewports.
4. **Demo Velocity**: Complete primary workflow demonstrated cleanly in **under 3 minutes 30 seconds**.
