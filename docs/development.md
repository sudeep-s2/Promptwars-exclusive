# LexLens — Local Development & Infrastructure Guide

This guide details the local setup, database infrastructure, and dependency requirements for running LexLens with Retrieval-Augmented Generation (RAG) powered by **PostgreSQL + pgvector** and **Google Gemini Embeddings**.

---

## 1. System Requirements

- **Python**: 3.11, 3.12, or 3.13
- **Node.js**: 18.x or 20.x (with npm)
- **Database**: PostgreSQL 15+ with the `pgvector` extension installed
- **API Keys**:
  - `GEMINI_API_KEY`: Required for LLM legal analysis, embeddings, and grounded Q&A.
  - `XAI_API_KEY`: Optional backup provider for structured legal analysis.

---

## 2. PostgreSQL + pgvector Setup

LexLens uses PostgreSQL with the `pgvector` extension for storing and performing cosine-distance similarity searches on canonical document chunks.

### Option A: Local Native PostgreSQL (Windows)
1. **Install PostgreSQL**:
   Download and install PostgreSQL 16 from the official installer or via Windows Package Manager:
   ```powershell
   winget install PostgreSQL.PostgreSQL.16
   ```
2. **Install pgvector**:
   - Download the precompiled `pgvector` binaries for your PostgreSQL version from [pgvector GitHub releases](https://github.com/pgvector/pgvector/releases).
   - Copy `vector.dll` into `C:\Program Files\PostgreSQL\16\lib\`.
   - Copy `vector.control` and `vector--*.sql` into `C:\Program Files\PostgreSQL\16\share\extension\`.
3. **Create Database & Enable Extension**:
   ```sql
   CREATE DATABASE lexlens;
   \c lexlens;
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Option B: Containerized pgvector (Docker / Podman)
If Docker or Podman is installed on your system, you can launch a ready-to-use pgvector instance with one command:
```bash
docker run -d \
  --name lexlens-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=lexlens \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

---

## 3. Environment Configuration

Create or update `backend/.env` (never commit this file to version control):

```bash
# LLM & Embedding Secrets (Backend-only)
GEMINI_API_KEY=your_gemini_api_key_here
XAI_API_KEY=your_xai_api_key_here

# Active LLM Provider (gemini default)
LLM_PROVIDER=gemini

# PostgreSQL Database Connection
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/lexlens
```

> **Embedding & LLM Specifications**:
> - **Embedding model**: `gemini-embedding-2`
> - **Output dimensionality**: 768
> - **Primary LLM model**: `gemini-2.5-flash`
> - **Backup LLM model**: `grok-4`
>
> All model names are centralized inside the backend provider code. Do NOT configure model names in `.env`.

---

## 4. Running Database Migrations

LexLens uses **Alembic** for version-controlled database schema management.

To apply migrations on your fresh database:
```bash
cd backend
alembic upgrade head
```

This migration:
1. Ensures `CREATE EXTENSION IF NOT EXISTS vector;` is executed.
2. Creates the `documents` metadata table.
3. Creates the `document_chunks` table with `embedding vector(768)` and a unique constraint on `(document_id, chunk_id)` for idempotent re-indexing.

---

## 5. Starting the Development Servers

### Backend (FastAPI)
```bash
cd backend
# Activate virtual environment
.\venv\Scripts\Activate.ps1    # Windows PowerShell
# or source venv/bin/activate  # macOS / Linux

uvicorn app.main:app --reload --port 8000
```
- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## 6. Running Automated Tests

The test suite validates document chunking, LLM analysis, embeddings, vector indexing, retrieval isolation, and grounded Q&A with 100% mocked providers (using 0 API credits):

```bash
# Run all backend tests
pytest backend/tests -v

# Run frontend production build & TypeScript validation
cd frontend
npm run build
```

---

## 7. RAG Evaluation Dataset

A curated dataset of representative legal questions across commercial agreements is located at:
```text
backend/tests/rag_eval/legal_qa_eval.json
```
This dataset evaluates retrieval quality and grounding status across diverse legal categories (payment deadlines, termination, IP rights, liability caps, cross-section clauses, and out-of-scope refusals).
