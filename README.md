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

LexLens follows a decoupled client-server architecture with an integrated RAG and GenAI analysis pipeline:
- **Frontend**: React 19 + TypeScript + Vite. Provides drag-and-drop document upload, executive analysis workspace, Attention Radar risk tiers, Clause Source Drawer, grounded Q&A with verifiable citations, and Attorney Consultation Prep Sheet.
- **Backend**: Python 3.13 + FastAPI + PyMuPDF. Exposes REST APIs, enforces file validation (PDF-only, <=10 MB), performs page-by-page text extraction, cleans legal text, detects legal headings, and produces deterministic structured canonical chunks (`chunk-p{page}-{idx:03d}`).
- **Vector Storage & Semantic Retrieval**: PostgreSQL with pgvector. Stores document chunk records and 768-dimensional embeddings generated via Google Gemini (`gemini-embedding-2`). Executes exact cosine similarity search scoped strictly to the active `document_id`.
- **Structured Legal Analysis**: Google Gemini (Flash default) with xAI Grok fallback. Produces structured legal analysis and answers queries strictly grounded in document chunks.

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
|  |      * POST /api/documents/rag/qa                         |  |
|  |      * POST /api/documents/qa (Direct chunk fallback)     |  |
|  |  - DocumentWorkflowService (Centralized Orchestration)    |  |
|  +-----------------------------------------------------------+  |
|            |                           |               |        |
|            v                           v               v        |
|  +-------------------+       +----------------+ +-------------+ |
|  | DocumentProcessor |       |   RAGService   | |LegalAnalyzer| |
|  |  - PyMuPDF text   |       |  - pgvector DB | | - Gemini    | |
|  |  - Canonical      |       |  - Gemini 768d | |   Flash     | |
|  |    chunk-p{page}  |       |    embeddings  | | - Structured| |
|  |  - Heading parser |       |  - Cosine k-NN | |   hydration | |
|  +-------------------+       +----------------+ +-------------+ |
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
- **PostgreSQL + pgvector**: Vector database storing document chunks and 768-dim embeddings.
- **Google Gemini**: Default LLM for structured document analysis and `gemini-embedding-2` embeddings.
- **xAI Grok**: Optional alternative LLM provider for structured analysis.
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
│   │   │   ├── documents.py                # Document upload, RAG Q&A, and direct Q&A routes
│   │   │   └── health.py                   # GET /api/health route handler
│   │   ├── db/
│   │   │   └── session.py                  # SQLAlchemy session factory & database availability probe
│   │   ├── models/
│   │   │   ├── __init__.py                 # Models package export
│   │   │   └── document.py                 # Document & DocumentChunkModel (pgvector)
│   │   ├── schemas/
│   │   │   ├── __init__.py                 # Pydantic schemas package export
│   │   │   ├── analysis.py                 # LegalAnalysis, LegalFinding, CounselQuestion schemas
│   │   │   ├── document.py                 # DocumentChunk, DocumentMetadata, Response schemas
│   │   │   ├── health.py                   # Pydantic HealthResponse schema
│   │   │   └── rag.py                      # RAG Q&A request and response schemas
│   │   ├── services/
│   │   │   ├── __init__.py                 # Services export
│   │   │   ├── analyzer.py                 # Grounded legal analyzer & finding hydration
│   │   │   ├── document_processor.py       # PDF validation, PyMuPDF extraction & chunking
│   │   │   ├── embeddings/                 # GeminiEmbeddingProvider (gemini-embedding-2, 768d)
│   │   │   ├── llm/                        # GeminiProvider (default) & GrokProvider (backup)
│   │   │   ├── rag_service.py              # pgvector indexing, cosine k-NN retrieval & grounded Q&A
│   │   │   └── workflow_service.py         # DocumentWorkflowService end-to-end orchestrator
│   │   └── main.py                         # FastAPI application entrypoint & CORS
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_documents.py               # Document extraction, validation & chunking tests
│   │   ├── test_integration.py             # E2E workflow, RAG Q&A, and isolation tests
│   │   ├── test_llm.py                     # Provider switching, structured parsing & hydration tests
│   │   └── test_rag.py                     # Embedding dimensions, indexing & retrieval tests
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
   - **Document Upload & Analysis**: `POST http://localhost:8000/api/documents/upload`
   - **Grounded RAG Q&A**: `POST http://localhost:8000/api/documents/rag/qa`
   - **Direct Chunk Q&A Fallback**: `POST http://localhost:8000/api/documents/qa`
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

## 8. Integrated MVP Capabilities

The system integrates all core capabilities into an end-to-end user workflow:
- [x] **PDF Document Ingestion**: PyMuPDF extraction, text cleaning, section detection, and canonical chunking (`chunk-p{page}-{idx:03d}`).
- [x] **Vector Database & Embeddings**: PostgreSQL + pgvector vector storage with Google Gemini (`gemini-embedding-2`, 768 dimensions) and document-isolated exact cosine k-NN retrieval.
- [x] **Structured Legal Analysis**: Provider-abstracted legal analysis via Google Gemini (default) or xAI Grok with zero-trust source chunk hydration.
- [x] **Document-Grounded Q&A**: Real-time semantic question answering with explicit page and section citations and out-of-scope refusal handling.
- [x] **Full Interactive Workspace**: Attention Radar risk tiers, Clause Source Drawer with verbatim text, Attorney Consultation Prep Sheet with one-click copy, and clean session reset.
- [x] **Automated Test Suite**: 51 comprehensive backend unit, RAG, provider, and integration tests passing with 100% success rate.

---

## 9. Future Roadmap

- **Multi-Document Comparison**: Side-by-side clause diffing across contract versions or negotiation redlines.
- **Enterprise Integrations**: Integration with contract lifecycle management (CLM) platforms, cloud storage, and authenticated workspaces.
- **Advanced Export & Reporting**: PDF and DOCX export for executive summaries and attorney consultation briefings.
