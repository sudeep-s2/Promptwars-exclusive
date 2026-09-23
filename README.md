# LexLens — Legal AI Assistant
**PromptWars Exclusive Edition**

> **Notice:** LexLens provides automated legal information and assistance to help users navigate and comprehend legal documentation. It is not a law firm and does **not** provide legal advice or substitute for consultation with a qualified legal professional.

---

## 1. Project Purpose

Legal contracts, non-disclosure agreements, terms of service, and regulatory filings can be complex, dense, and challenging to navigate without formal legal training.

**LexLens** is being developed to help users:
- **Understand complex legal documents** in accessible language.
- **Identify critical clauses, obligations, liabilities, and deadlines**.
- **Ask questions grounded directly in uploaded documents** with verifiable source citations.
- **Generate actionable summaries, compliance checklists, and questions** to review with legal counsel.

---

## 2. Architecture Overview

LexLens follows a decoupled client-server architecture:
- **Frontend**: React 19 + TypeScript + Vite. Provides drag-and-drop document upload, connection testing, document metadata display, and an interactive section-aware chunk inspector.
- **Backend**: Python 3.13 + FastAPI + PyMuPDF. Exposes REST APIs, enforces file validation (PDF-only, <=10 MB), performs in-flight page-by-page text extraction, cleans legal text, detects legal headings, and produces deterministic structured chunks.
- **Communication**: Frontend and backend communicate purely over HTTP REST APIs using JSON and multipart/form-data.

### Architecture Diagram

```
+-----------------------------------------------------------------+
|                          User Browser                           |
|  +-----------------------------------------------------------+  |
|  |             React 19 + TypeScript (Vite)                  |  |
|  |  - Dashboard View & Header Branding                       |  |
|  |  - Non-Dismissible Legal Disclaimer Banner                |  |
|  |  - Backend Connection Probe (GET /api/health)             |  |
|  |  - Document Upload Dropzone (.pdf, max 10MB)              |  |
|  |  - Metadata Summary & Interactive Chunks Viewer           |  |
|  |  - Centralized API Service (services/api.ts)              |  |
|  +-----------------------------------------------------------+  |
+--------------------------------|--------------------------------+
                                 |
                     HTTP / REST (JSON & Multipart)
                     CORS Enabled (e.g., :5173 -> :8000)
                                 |
                                 v
+-----------------------------------------------------------------+
|                     FastAPI Backend Service                     |
|  +-----------------------------------------------------------+  |
|  |                   FastAPI / Uvicorn Server                |  |
|  |  - CORS Middleware (Local dev ports: 5173, etc.)          |  |
|  |  - API Router (/api):                                     |  |
|  |      * GET  /api/health                                   |  |
|  |      * POST /api/documents/upload                         |  |
|  |  - Pydantic Validation Schemas (app/schemas/)             |  |
|  +-----------------------------------------------------------+  |
|                                |                                |
|                                v                                |
|  +-----------------------------------------------------------+  |
|  |         Document Processor Service (PyMuPDF)              |  |
|  |  - In-flight memory validation (PDF magic bytes, size)    |  |
|  |  - Page-by-page extraction (1-indexed page preservation)  |  |
|  |  - Text cleaning (line wrap hyphens, excess newlines)     |  |
|  |  - Section detection (Articles, Sections, Clauses)        |  |
|  |  - Deterministic chunking (chunk-p{page}-{idx})           |  |
|  +-----------------------------------------------------------+  |
|                                |                                |
|                                v                                |
|              [Future Phases: RAG / LLM / Storage]               |
|     (Embeddings, Vector DB, Grounded Legal Q&A, Summaries)      |
+-----------------------------------------------------------------+
```

---

## 3. Technology Stack

### Frontend
- **React 19**: Modern UI component architecture.
- **TypeScript**: Full type safety across components and API responses.
- **Vite 8**: High-speed development server and production bundler.
- **Fetch API / Typed Services**: Native FormData upload without external HTTP libraries.

### Backend
- **Python 3.13+**: Core asynchronous runtime.
- **FastAPI**: High-performance REST API framework.
- **Uvicorn**: ASGI web server.
- **PyMuPDF (`pymupdf`)**: High-performance, memory-efficient PDF text extraction.
- **Pydantic v2**: Type validation and schema generation.
- **pytest & httpx**: Automated unit and integration testing.

---

## 4. Folder Structure

```
legal-ai-assistant/ (PW-E/)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BackendStatusCard.tsx       # Live health check REST probe
│   │   │   ├── DisclaimerBanner.tsx        # Mandatory legal disclaimer
│   │   │   ├── DocumentUpload.tsx          # PDF upload, metadata card & chunk inspector
│   │   │   └── Header.tsx                  # LexLens branding & edition badge
│   │   ├── pages/
│   │   │   └── Dashboard.tsx               # Main landing/dashboard page
│   │   ├── services/
│   │   │   └── api.ts                      # Centralized API service layer (health & upload)
│   │   ├── types/
│   │   │   ├── document.ts                 # DocumentChunk, DocumentUploadResponse types
│   │   │   └── health.ts                   # HealthResponse & ConnectionState types
│   │   ├── App.css                         # Custom styling for upload, cards, accordions
│   │   ├── App.tsx                         # Root component
│   │   ├── index.css                       # Design tokens and base resets
│   │   └── main.tsx                        # React application entrypoint
│   ├── .env                                # Frontend environment variables
│   ├── .env.example                        # Template for environment configuration
│   ├── index.html                          # HTML shell with updated title
│   ├── package.json                        # Node dependencies and scripts
│   ├── tsconfig.json                       # TypeScript compiler settings
│   └── vite.config.ts                      # Vite configuration
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py                 # API router aggregator
│   │   │   ├── documents.py                # POST /api/documents/upload route handler
│   │   │   └── health.py                   # GET /api/health route handler
│   │   ├── models/
│   │   │   └── __init__.py                 # Database/Domain models placeholder
│   │   ├── schemas/
│   │   │   ├── __init__.py                 # Pydantic schemas package export
│   │   │   ├── document.py                 # DocumentChunk, DocumentMetadata, Response schemas
│   │   │   └── health.py                   # Pydantic HealthResponse schema
│   │   ├── services/
│   │   │   ├── __init__.py                 # Services export
│   │   │   └── document_processor.py       # PDF validation, PyMuPDF extraction & chunking
│   │   └── main.py                         # FastAPI application entrypoint & CORS
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_documents.py               # 16 automated unit & API integration tests
│   ├── pytest.ini                          # Test configuration
│   ├── requirements.txt                    # Python dependencies
│   └── venv/                               # Python virtual environment (ignored)
│
├── sample_documents/                       # Sample PDFs for testing
│   ├── sample_nda.pdf                      # Mutual Non-Disclosure Agreement
│   └── sample_services_agreement.pdf       # Master Services Agreement
│
├── .gitignore                              # Comprehensive git ignore file
└── README.md                               # Project documentation
```

---

## 5. How to Start the Backend

### Prerequisites
- Python 3.10+ installed

### Setup & Run
1. Open a terminal and navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Activate your virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```powershell
   python -m uvicorn app.main:app --reload --port 8000
   ```
5. Endpoints:
   - **Health Check**: `GET http://localhost:8000/api/health`
   - **Document Upload**: `POST http://localhost:8000/api/documents/upload`
   - **Swagger Interactive Docs**: `http://localhost:8000/docs`

### Running Backend Tests
Execute the automated test suite with pytest:
```powershell
python -m pytest tests -v
```

---

## 6. How to Start the Frontend

### Prerequisites
- Node.js (v18+) and npm installed

### Setup & Run
1. Open a terminal and navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Ensure `.env` is present:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```
3. Install dependencies:
   ```powershell
   npm install
   ```
4. Start the Vite development server:
   ```powershell
   npm run dev
   ```
5. Open your browser at `http://localhost:5173`.

---

## 7. How Frontend Communicates with Backend

1. **Environment Configuration**:
   The frontend references `import.meta.env.VITE_API_BASE_URL` (default `http://localhost:8000`).
2. **Centralized Service Layer (`frontend/src/services/api.ts`)**:
   - `getHealthStatus()`: Sends `GET /api/health` and returns typed `HealthResponse`.
   - `uploadDocument(file)`: Appends the selected file to browser `FormData` and sends `POST /api/documents/upload`. Does not set `Content-Type` manually so the browser sets the boundary.
3. **Type-Safe Contract**:
   TypeScript types (`DocumentChunk`, `DocumentUploadResponse`) directly mirror backend Pydantic models.
4. **CORS Headers**:
   FastAPI `CORSMiddleware` allows requests from `http://localhost:5173` and common local development ports.

---

## 8. Current Phase 2 Scope

Phase 2 introduces real document processing without AI:
- [x] Dedicated thin route `POST /api/documents/upload` handling `multipart/form-data`.
- [x] Strict file validation: PDF format only, magic bytes `%PDF` check, 10 MB size ceiling.
- [x] In-memory PDF processing via PyMuPDF (zero disk/database persistence).
- [x] Text cleaning: normalization of excess newlines, trailing spaces, and broken hyphenated wraps.
- [x] Section-aware chunking heuristics for legal headings (`SECTION`, `ARTICLE`, `CLAUSE`, numbered `1. Definitions`), with paragraph fallback.
- [x] Clean error handling without leaking internal stack traces (400, 413, 415, 422, 500).
- [x] Interactive React upload component: drag-and-drop, client-side validation, loading indicator, metadata summary, and an expandable chunk inspector with copy button and search filter.
- [x] 16 automated backend unit and integration tests passing with 100% success rate.
- [x] Synthetic legal sample PDFs (`sample_nda.pdf`, `sample_services_agreement.pdf`) verified end-to-end.

---

## 9. Future Phases

- **Phase 3: Embeddings & Retrieval (RAG Foundation)**:
  - Vector embeddings generation and vector storage.
  - Semantic search and clause retrieval based on user queries.
- **Phase 4: GenAI Legal Assistant Core**:
  - LLM integration with grounded prompt engineering.
  - Document summaries, clause breakdown, and question answering with verifiable citations.
- **Phase 5: Actionable Intelligence & Guardrails**:
  - Automated generation of review checklists and counsel questions.
  - Hallucination detection, confidence scoring, and strict legal disclaimers.
