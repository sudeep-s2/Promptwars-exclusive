# LexLens — Phase 2: UX & Information Architecture Specification

**System**: LexLens (PromptWars Exclusive Edition)  
**Document**: UX & Information Architecture Specification  
**Version**: 1.0.0  
**Target Delivery**: September 2026  

---

## 1. Information Architecture & Sitemap

LexLens is structured as a **focused, document-centric workspace** rather than a multi-level web application. Non-lawyers reviewing contracts need immediate clarity without navigational friction.

```
+-----------------------------------------------------------------------------------------+
|                                    LexLens Sitemap                                      |
|                                                                                         |
|  [ 1. Top Navigation Bar ]                                                              |
|   - Logo & Version Badge ("LexLens Exclusive Edition")                                  |
|   - Persistent Legal Notice Alert                                                       |
|   - Backend Health Probe Status Indicator                                               |
|                                                                                         |
|  [ 2. Workspace Layout ]                                                                |
|                                                                                         |
|   STATE A: Pre-Ingestion                               STATE B: Active Workspace        |
|   +---------------------------------------+   +---------------------------------------+ |
|   | - Hero Banner & Value Proposition     |   | - Document Header & Metadata Bar      | |
|   | - Drag & Drop Upload Zone             |   | - Executive Summary Card              | |
|   | - Accepted Formats (.pdf, <=10MB)     |   | - Attention Radar (Severity Filter)   | |
|   | - Sample Document One-Click Loaders   |   | - Dual-Pane Document Workspace:       | |
|   +---------------------------------------+   |     * Left: Categorized Clause Cards  | |
|                                               |     * Right: Interactive Source Viewer| |
|                                               | - Grounded Q&A Assistant Panel        | |
|                                               | - Counsel Prep Export Action Modal    | |
|                                               +---------------------------------------+ |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Reusable Component Hierarchy

```
App
 └── DashboardLayout
      ├── Header (Branding, Edition Badge, REST Health Dot)
      ├── LegalDisclaimerBanner (Persistent, non-dismissible)
      ├── DocumentUploadDropzone (Pre-ingestion state)
      │    ├── FileInputHidden
      │    ├── DragOverIndicator
      │    └── SampleDocumentQuickButtons
      └── DocumentAnalysisWorkspace (Post-ingestion state)
           ├── DocumentHeaderBar (Filename, Size, Pages, Reset Button)
           ├── ExecutiveSummaryCard (Parties, Term, Financial Summary)
           ├── AttentionRadarFilter (All, High Attention, Moderate, Standard)
           ├── ClauseCardsList
           │    └── ClauseCard
           │         ├── SeverityBadge (Red, Yellow, Green)
           │         ├── CategoryPill (Liability, Payment, IP, Termination)
           │         ├── PlainLanguageSummary
           │         ├── WhyItMattersCallout
           │         └── ViewSourceButton
           ├── ClauseSourceDrawer (Slide-out or inline split viewer)
           │    ├── VerbatimTextHighlight
           │    ├── PageReferenceTag
           │    └── CopyExcerptButton
           ├── GroundedQAPanel
           │    ├── SuggestedPromptChips
           │    ├── QueryInput
           │    └── AnswerCard (Grounded answer + Clickable citation pill)
           └── CounselPrepModal
                ├── ChecklistItems
                ├── TargetedQuestionsForAttorney
                └── CopyPrepSheetAction
```

---

## 3. Screen & State Specifications

### Screen 1: Ingestion & Upload View
- **Purpose**: Welcomes the user, explains the product's boundaries, and accepts PDF contracts.
- **User Goal**: Safely upload an inbound contract or test a pre-loaded sample agreement.
- **States**:
  - *Empty / Default*: Clean dropzone with icon, "Click or drag & drop PDF up to 10 MB", sample loaders for `sample_nda.pdf` and `sample_services_agreement.pdf`.
  - *Drag-Over*: Highlighted dashed border with soft blue background (`#EFF6FF`).
  - *File Selected*: Shows file pill (`contract.pdf (245 KB)`), with "Clear" and "Process Document" buttons.
  - *Error*: Red alert banner displaying validation failure (*"Unsupported format: only .pdf accepted"* or *"File exceeds 10 MB limit"*).

### Screen 2: In-Flight Processing State
- **Purpose**: Provides real-time feedback while the backend extracts, cleans, and chunks the document.
- **User Goal**: Understand that the document is being analyzed in memory.
- **UI Element**: Pulsing progress bar with micro-step status indicators:
  1. `Validating PDF signature and 10 MB limit...`
  2. `Extracting pages with PyMuPDF...`
  3. `Cleaning formatting and segmenting legal sections...`
  4. `Generating Attention Radar & plain-English translations...`

### Screen 3: Analysis Dashboard & Attention Radar (Main Screen)
- **Purpose**: Primary workspace displaying high-level understanding and prioritized attention areas.
- **Information Hierarchy (Top to Bottom)**:
  1. **Document Identity & Quick Stats**: File name, page count, total characters, chunk count, and a reset button.
  2. **Executive Summary Card**: 3 clean columns:
     - *Parties & Effective Date*
     - *Scope & Duration*
     - *Financial Commitments*
  3. **Attention Radar Navigation**: Tabbed filter allowing user to isolate:
     - 🔴 **High Attention (2)**: Clauses imposing uncapped liability or IP transfer.
     - 🟡 **Moderate (3)**: Auto-renewal windows, restrictive notice periods.
     - 🟢 **Standard (4)**: Boilerplate severability, governing law, force majeure.
  4. **Categorized Clause Cards**: Clean cards detailing what the clause says, why it matters, and a direct button to verify against the source document.

### Screen 4: Clause Inspector & Verbatim Grounding Drawer
- **Purpose**: Delivers uncompromised explainability by linking AI translations directly to source text.
- **User Goal**: Verify that the AI's plain-English summary is 100% accurate before relying on it.
- **UI Presentation**: A clean slide-out drawer or dual-pane view:
  - *Top*: AI Interpretation (*"What this means in plain English"*).
  - *Middle*: Potential Risk / Implication (*"Why it matters"*).
  - *Bottom*: Verbatim Source Block with highlighted text and `[Page X, Section Y]` badge.
  - *Action*: "Copy Clause & Summary" button.

### Screen 5: Document-Grounded Q&A Panel
- **Purpose**: Empowers users to ask ad-hoc, conversational questions about the document without navigating away.
- **User Goal**: Get fast, verified answers to specific concerns (*"Can I cancel this contract early?"*).
- **UI Elements**:
  - *Prompt Suggestions*: Pre-computed chips like *"What are my payment deadlines?"*, *"What happens if I terminate?"*.
  - *Input*: Clean query box with submit button.
  - *Answer Display*: Conversational response with an explicit **Source Pill** (`Page 2, Section 3.1`). Clicking the pill scrolls the source viewer directly to the cited passage.
  - *Boundary Notification*: If the topic is absent from the contract, displays: *"This agreement does not specify terms for [topic]. We recommend asking your legal counsel."*

### Screen 6: Attorney Consultation Prep Sheet Modal
- **Purpose**: Fulfills the legal safety mandate by converting document insights into an actionable legal consultation agenda.
- **User Goal**: Save hundreds of dollars in legal fees by arriving at an attorney consultation with focused, high-leverage questions.
- **Content**:
  - Document Title & Date.
  - Summary of 3 Highest-Attention Clauses.
  - 4 Specific Legal Questions to Ask Counsel (*e.g., "1. Should we insert a mutual liability cap of 12 months fees in Section 5.2?"*).
  - One-click button: *"Copy Prep Sheet to Clipboard"* (formatted cleanly for email or print).

---

## 4. AI Explainability Framework (The 3-Tier Verification Model)

To prevent blind reliance on LLM interpretations, LexLens enforces a **3-Tier Visual Verification Model**:

```
+-----------------------------------------------------------------------------+
|                     Tier 1: AI High-Level Finding                           |
|       "High Attention: Unlimited Indemnification Clause Detected"           |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                     Tier 2: Plain-English Translation                       |
|   "You agree to pay all legal defense costs if the client is sued,          |
|    with zero monetary cap. This could exceed the contract value."           |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                     Tier 3: Verbatim Ground Truth                           |
|   [Page 2, Article IV] "Provider shall defend, indemnify, and hold harmless |
|   Client from any and all third-party claims, liabilities, or expenses..."  |
+-----------------------------------------------------------------------------+
```

Every UI card visually distinguishes between:
1. **AI Synthesis** (denoted with a subtle sparkle/AI badge `✦ LexLens Summary`).
2. **Document Ground Truth** (rendered in monospace/quote style with explicit page reference `📄 Page 2, Section 4.1`).

---

## 5. Accessibility & Responsive Guidelines

### Accessibility (WCAG 2.1 AA)
- **Color Contrast**: All text elements maintain a minimum contrast ratio of `4.5:1` against their backgrounds (e.g. Navy `#0F172A` on White `#FFFFFF` yields `16.2:1`).
- **Severity Signaling**: Risk badges use both **color and iconography/text** (e.g. 🔴 High Attention, 🟡 Moderate, 🟢 Standard) to ensure readability for color-blind users.
- **Keyboard Traversal**: Full tab ordering across upload dropzone, filter tabs, clause cards, and modal dialogs.
- **Focus Rings**: Prominent 2px focus ring (`#2563EB`) on all active interactive controls.

### Responsive Breakpoints
- **Desktop (1440px+)**: Dual-pane workspace (Executive Summary & Radar on Left, Source Viewer / Q&A on Right).
- **Laptop (1024px–1439px)**: Single column with slide-out drawer for clause source and Q&A.
- **Tablet / Mobile (375px–768px)**: Stacked cards layout; modal overlays for source text inspection and counsel prep export.

---

## 6. The 4-Minute Walkthrough Video Script & Flow

| Timestamp | Phase | Screen | What is Demonstrated |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:30** | Hook & Context | Landing View | Explain problem: complex legal documents cause paralysis; introduce LexLens as an intelligent navigator and counsel prep assistant. Show persistent legal disclaimer. |
| **0:30 – 1:00** | Ingestion | Upload Dropzone | Drag and drop `sample_services_agreement.pdf`. Show instant in-memory processing progress without lag. |
| **1:00 – 1:45** | Executive Overview & Radar | Main Dashboard | Tour the Executive Summary (Parties, Term, Fees). Click "High Attention" filter to instantly reveal the uncapped liability clause. |
| **1:45 – 2:30** | Explainability Drilldown | Clause Drawer | Click "View Source". Demonstrate the 3-Tier model: Plain English translation side-by-side with verbatim text on Page 2. Copy excerpt. |
| **2:30 – 3:15** | Grounded Q&A | Q&A Panel | Ask: *"What are the termination requirements?"*. Show grounded response citing `[Page 3, Section 6.1]`, grounding answers in retrieved document content and displaying source excerpts for verification. |
| **3:15 – 3:50** | Actionable Output | Counsel Prep Modal | Click "Generate Attorney Prep Sheet". Display structured questions for counsel review. Click "Copy Prep Sheet". |
| **3:50 – 4:00** | Wrap-Up | Summary Card | Reiterate: LexLens delivers instant comprehension and prepares users for professional review, ethically and reliably. |
