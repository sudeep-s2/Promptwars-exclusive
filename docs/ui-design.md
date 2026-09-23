# LexLens — Phase 2: Visual Design System & UI Component Specification

**System**: LexLens (PromptWars Exclusive Edition)  
**Document**: UI Design System & Component Specification  
**Version**: 1.0.0  
**Target Delivery**: September 2026  

---

## 1. Design Philosophy & Visual Language

LexLens is purposefully designed as an **editorial, serious, and trustworthy productivity workspace**, not a playful or whimsical AI chatbot. Legal documents involve high stakes, financial exposure, and professional obligations. The UI aesthetics reflect precision, restraint, and transparency.

### Core Visual Principles
1. **Calm Authority**: Deep legal navy, crisp slate neutrals, and restrained alert accents create an atmosphere of rigorous professional utility.
2. **Scannable Density**: Clean card boundaries, high contrast typography, and structured metadata chips prioritize rapid visual scanning over decorative fluff.
3. **Transparent Provenance**: AI-generated plain-English insights are clearly demarcated from original, immutable legal text through distinctive container styling (cards vs. monospace quotation wells).

---

## 2. Visual Design System

### 2.1 Color Palette

```
+-----------------------------------------------------------------------------------------+
|                                    LexLens Palette                                      |
|                                                                                         |
|  PRIMARY NAVY          TRUST BLUE            BG MAIN / SLATE       CARD SURFACE         |
|  #0F172A (Deep Slate)  #2563EB (Active Blue) #F8FAFC (Slate-50)   #FFFFFF (Pure White) |
|  #1E3A8A (Navy Accent) #1D4ED8 (Hover Blue)  #F1F5F9 (Slate-100)  #F8FAFC (Muted Well) |
|                                                                                         |
|  HIGH ATTENTION        MODERATE ATTENTION    STANDARD / SAFE       MUTED TEXT           |
|  #FEF2F2 (Red-50 bg)   #FFFBEB (Amber-50 bg) #ECFDF5 (Emerald bg)  #64748B (Slate-500)  |
|  #DC2626 (Crimson text)#D97706 (Amber text)  #059669 (Emerald text)#0F172A (Slate-900)  |
+-----------------------------------------------------------------------------------------+
```

| Token Name | Hex Code | Purpose / Application |
| :--- | :--- | :--- |
| `--color-brand-navy` | `#0F172A` | Primary headings, logo, high-contrast dark accents |
| `--color-brand-blue` | `#1E3A8A` | Sub-headings, active tab indicators, primary buttons |
| `--color-accent-blue` | `#2563EB` | Interactive links, focus rings, active hover states |
| `--color-bg-canvas` | `#F8FAFC` | Global page background |
| `--color-bg-surface` | `#FFFFFF` | Card containers, modals, input fields |
| `--color-border-subtle`| `#E2E8F0` | Default card borders, dividers |
| `--color-border-strong`| `#CBD5E1` | Input outlines, hover borders |
| `--color-text-primary` | `#0F172A` | Primary body and heading copy |
| `--color-text-secondary`| `#475569`| Descriptive paragraphs, secondary metadata |
| `--color-text-muted` | `#64748B` | Timestamps, helper text, footnote disclaimers |
| `--color-risk-high-bg` | `#FEF2F2` | Background for High-Attention / Uncapped Liability clauses |
| `--color-risk-high-text`| `#DC2626`| Text / badge for High-Attention items |
| `--color-risk-mod-bg` | `#FFFBEB` | Background for Moderate-Attention items (e.g. Auto-renewal) |
| `--color-risk-mod-text`| `#D97706` | Text / badge for Moderate-Attention items |
| `--color-risk-safe-bg` | `#ECFDF5` | Background for Standard / Boilerplate clauses |
| `--color-risk-safe-text`| `#059669`| Text / badge for Standard clauses |

---

### 2.2 Typography Scale

The type system pairs a highly legible geometric sans-serif for UI copy (**Inter**) with a calibrated monospace font (**JetBrains Mono**) for verbatim legal excerpts and section identifiers.

| Style Role | Font Family | Size | Weight | Line Height | Tracking |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Display Header (H1)** | Inter, sans-serif | 28px (1.75rem) | 700 | 1.25 | -0.02em |
| **Section Header (H2)** | Inter, sans-serif | 20px (1.25rem) | 600 | 1.3 | -0.01em |
| **Card Header (H3)** | Inter, sans-serif | 16px (1.0rem) | 600 | 1.4 | 0 |
| **Body Default** | Inter, sans-serif | 14px (0.875rem) | 400 | 1.5 | 0 |
| **Body Medium / Bold** | Inter, sans-serif | 14px (0.875rem) | 500 / 600 | 1.5 | 0 |
| **Small / Meta Label** | Inter, sans-serif | 12px (0.75rem) | 600 | 1.4 | +0.02em (uppercase) |
| **Legal Excerpt (Code)**| JetBrains Mono, monospace | 13px (0.8125rem) | 400 | 1.6 | 0 |

---

### 2.3 Spacing & Elevation Scale

- **Base Unit**: `4px`
- **Spacing Scale**:
  - `space-1`: 4px
  - `space-2`: 8px
  - `space-3`: 12px
  - `space-4`: 16px (Standard component padding)
  - `space-6`: 24px (Card padding, section gap)
  - `space-8`: 32px (Major section layout margin)
- **Border Radii**:
  - Small (Tags, Badges): `4px`
  - Medium (Buttons, Inputs): `6px`
  - Large (Cards, Dropzones): `10px`
  - Pill (Status dots, indicators): `9999px`
- **Shadows**:
  - `shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
  - `shadow-md`: `0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)`
  - `shadow-modal`: `0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1)`

---

## 3. Component Specifications

### 3.1 Persistent Legal Disclaimer Banner
- **Container**: Border `1px solid #FDE68A`, background `#FFFBEB`, border-radius `8px`, padding `12px 16px`.
- **Icon**: `⚠️` or warning shield symbol in Amber.
- **Copy**: *"Legal Disclaimer: LexLens provides automated legal information and document assistance to help users navigate and comprehend legal documentation. LexLens is not a law firm and does not provide legal advice or replace the services of a qualified attorney."*
- **Position**: Top of application view, immediately below header.

### 3.2 Document Upload Dropzone
- **Container**: Border `2px dashed #CBD5E1`, background `#F8FAFC`, border-radius `10px`, min-height `180px`.
- **Hover State**: Border `#1E3A8A`, background `#EFF6FF`.
- **Drag-Over State**: Border `#2563EB`, scale `1.005`, box-shadow `shadow-sm`.
- **Elements**: Document icon (`📄`), title *"Upload Legal Document (.PDF)"*, subtitle *"Files up to 10 MB. Scanned image-only PDFs are rejected."*, file format badges (`.PDF Only`, `Max 10 MB`).

### 3.3 Executive Summary Card
- **Layout**: 3-column responsive grid on desktop (`grid-template-columns: repeat(3, 1fr)`).
- **Column 1: Parties & Dates**:
  - Label: `DOCUMENT OVERVIEW`
  - Title: *Master Services Agreement*
  - Parties: `Acme Corp (Client)` ↔ `DevStudio LLC (Provider)`
  - Effective Date: `October 1, 2026`
- **Column 2: Scope & Duration**:
  - Label: `TERM & DURATION`
  - Term: `12 Months (Renews Annually)`
  - Termination: `30 Days Written Notice`
- **Column 3: Financial Summary**:
  - Label: `FINANCIAL COMMITMENTS`
  - Rates: `$120 / Hour (Monthly invoicing)`
  - Payment Terms: `Net 30 Days (1.5% late fee)`

### 3.4 Attention Radar & Clause Cards
- **Navigation Tabs**:
  - `All Clauses (7)`
  - `🔴 High Attention (2)`
  - `🟡 Moderate (2)`
  - `🟢 Standard (3)`
- **Clause Card Anatomy**:
  - **Header Row**:
    - Severity Pill: `🔴 HIGH ATTENTION` (Background `#FEF2F2`, Text `#DC2626`)
    - Category Pill: `Liability & Indemnity`
    - Section Tag: `Article IV, Section 4.1`
  - **Body Content**:
    - **Title**: *Uncapped Third-Party IP Indemnification*
    - **Plain-English Summary**: *"You agree to defend and pay all legal costs for the Client if deliverables infringe any third-party patent or copyright. There is no financial cap on this obligation."*
    - **Why It Matters Callout**: *"A single infringement dispute could expose your agency to hundreds of thousands of dollars in legal fees, far exceeding the fees earned under this contract."*
  - **Footer Actions**:
    - *"View Original Clause"* (Opens Slide-out Drawer)
    - *"Ask Question about Clause"* (Focuses Q&A input)

### 3.5 Grounded Q&A Assistant Panel
- **Container**: Card panel docked on right side (desktop) or stacked tab.
- **Header**: Title *"Ask LexLens"*, subtitle *"Grounded exclusively in this contract"*.
- **Suggested Queries**:
  - Pill 1: *"What are the payment deadlines?"*
  - Pill 2: *"Who owns created IP deliverables?"*
  - Pill 3: *"How can either party terminate?"*
- **Query Input**: Input box with placeholder *"Ask a question about this agreement..."* and Send button.
- **Answer Display**:
  - Answer text in clean 14px prose.
  - Source Verification Box:
    ```
    ┌────────────────────────────────────────────────────────┐
    │ 📄 Source: Page 2, Section 3.2 (Intellectual Property) │
    │ "All deliverables created specifically for Client...   │
    │  shall become the sole property of Client upon full    │
    │  payment."                                             │
    └────────────────────────────────────────────────────────┘
    ```

### 3.6 Attorney Consultation Prep Sheet Modal
- **Container**: Centered modal overlay, max-width `680px`, background `#FFFFFF`, border-radius `12px`, padding `24px`.
- **Header**: Title *"Attorney Consultation Prep Sheet"*, print button, close button.
- **Section 1: Executive Snapshot**: Contract parties, date, and overall attention count.
- **Section 2: High-Priority Discussion Items**:
  1. *Section 4.1 Indemnification*: *"Ask attorney if we should insist on adding a mutual $50,000 liability ceiling or limiting indemnity to gross negligence."*
  2. *Section 2.2 Payment Terms*: *"Ask attorney if a 1.5% monthly late fee is customary and enforceable under Delaware law."*
  3. *Section 5.1 Consequential Damages*: *"Confirm that the mutual waiver of consequential damages protects our pre-existing code library."*
- **Action Buttons**:
  - Primary: `📋 Copy Prep Sheet to Clipboard`
  - Secondary: `🖨️ Print / Save as PDF`

---

## 4. Realistic Mock Data Models

Below is the concrete mock data dataset engineered to prototype the complete user journey before AI integration.

### Mock Dataset: `sample_services_agreement.pdf`

```typescript
export interface MockDocumentAnalysis {
  metadata: {
    filename: string;
    file_size_formatted: string;
    page_count: number;
    text_length: number;
    chunk_count: number;
    document_type: string;
    parties: {
      client: string;
      provider: string;
    };
    effective_date: string;
    duration: string;
    financial_summary: string;
  };
  attention_radar: {
    high_count: number;
    moderate_count: number;
    standard_count: number;
    clauses: MockClauseFinding[];
  };
  suggested_questions: string[];
  counsel_prep_sheet: {
    document_title: string;
    generated_date: string;
    discussion_points: Array<{
      clause_ref: string;
      topic: string;
      recommended_question: string;
    }>;
  };
}

export interface MockClauseFinding {
  id: string;
  severity: 'high' | 'moderate' | 'standard';
  category: 'Liability' | 'Payment' | 'Intellectual Property' | 'Termination' | 'Boilerplate';
  title: string;
  plain_english: string;
  why_it_matters: string;
  page_number: number;
  section_title: string;
  verbatim_excerpt: string;
}

export const MOCK_SERVICES_AGREEMENT_DATA: MockDocumentAnalysis = {
  metadata: {
    filename: "sample_services_agreement.pdf",
    file_size_formatted: "3.01 KB",
    page_count: 3,
    text_length: 1483,
    chunk_count: 7,
    document_type: "Master Services Agreement",
    parties: {
      client: "Client Corp",
      provider: "Consulting Provider LLC"
    },
    effective_date: "Executed SOW Date",
    duration: "Ongoing until terminated (30-day written notice)",
    financial_summary: "Monthly invoicing, Net 30 days, 1.5% late fee per month"
  },
  attention_radar: {
    high_count: 2,
    moderate_count: 2,
    standard_count: 3,
    clauses: [
      {
        id: "clause-01",
        severity: "high",
        category: "Liability",
        title: "Uncapped Third-Party IP Indemnification",
        plain_english: "You agree to pay all legal defense expenses and damages if any third party claims that your deliverables infringe their patent, copyright, or trade secret.",
        why_it_matters: "There is no dollar cap on this obligation. A single IP claim could bankrupt a solo contractor or small agency, even if the infringement was unintentional.",
        page_number: 2,
        section_title: "ARTICLE IV: INDEMNIFICATION AND WARRANTIES",
        verbatim_excerpt: "4.1 Provider Indemnity. Provider shall defend and indemnify Client against any third-party claims alleging that the Deliverables infringe any valid patent, copyright, or trade secret."
      },
      {
        id: "clause-02",
        severity: "high",
        category: "Intellectual Property",
        title: "Work Product Ownership Transferred to Client",
        plain_english: "All deliverables created specifically under this contract belong exclusively to the client upon full payment, designated as 'work made for hire.'",
        why_it_matters: "Make sure you do not accidentally transfer ownership of pre-existing proprietary tools, starter kits, or boilerplate code you intend to reuse for other clients.",
        page_number: 2,
        section_title: "ARTICLE III: INTELLECTUAL PROPERTY RIGHTS",
        verbatim_excerpt: "3.2 Work Product. All deliverables created specifically for Client under any SOW shall be deemed 'work made for hire' and shall become the sole property of Client upon full payment."
      },
      {
        id: "clause-03",
        severity: "moderate",
        category: "Payment",
        title: "Aggressive Overdue Interest (1.5% / Month)",
        plain_english: "Unpaid invoices accrue interest at 1.5% per month (18% annualized) after the 30-day net payment period.",
        why_it_matters: "Ensures prompt payment, but verify that dispute procedures allow you to pause interest on disputed amounts in good faith.",
        page_number: 1,
        section_title: "ARTICLE II: COMPENSATION AND PAYMENT TERMS",
        verbatim_excerpt: "2.2 Invoicing. Invoices shall be rendered monthly and payable within thirty (30) days of receipt. Overdue balances accrue interest at 1.5% per month."
      },
      {
        id: "clause-04",
        severity: "moderate",
        category: "Liability",
        title: "12-Month Trailing Liability Ceiling",
        plain_english: "Each party's total legal liability is capped at the total amount of fees paid during the preceding 12 months.",
        why_it_matters: "A 12-month cap is standard industry practice, but ensure that the uncapped indemnification clause in Section 4.1 does not override this limit.",
        page_number: 3,
        section_title: "ARTICLE V: LIMITATION OF LIABILITY",
        verbatim_excerpt: "5.2 Aggregate Liability Cap. In no event shall either party's aggregate liability under this Agreement exceed the total fees paid by Client during the preceding twelve (12) month period."
      },
      {
        id: "clause-05",
        severity: "standard",
        category: "Termination",
        title: "Mutual Waiver of Consequential Damages",
        plain_english: "Neither party can sue the other for lost profits, indirect, or incidental damages.",
        why_it_matters: "Standard mutual protection that prevents runaway claims for speculative future business losses.",
        page_number: 3,
        section_title: "ARTICLE V: LIMITATION OF LIABILITY",
        verbatim_excerpt: "5.1 Consequential Damages Waiver. Neither party shall be liable to the other for indirect, special, incidental, or consequential damages."
      },
      {
        id: "clause-06",
        severity: "standard",
        category: "Boilerplate",
        title: "Severability Clause",
        plain_english: "If a court finds any specific clause invalid, the rest of the agreement remains fully binding.",
        why_it_matters: "Standard legal protection preventing an entire contract from collapsing over one contested sentence.",
        page_number: 3,
        section_title: "ARTICLE VI: MISCELLANEOUS PROVISIONS",
        verbatim_excerpt: "6.1 Severability. If any provision of this Agreement is held invalid, the remainder shall remain in full force and effect."
      },
      {
        id: "clause-07",
        severity: "standard",
        category: "Boilerplate",
        title: "Entire Agreement / Integration Clause",
        plain_english: "This written agreement supersedes all previous emails, phone calls, or oral discussions.",
        why_it_matters: "Any oral promises made during sales negotiations (e.g. 'we won't enforce the 30-day notice') are legally void unless written into this document.",
        page_number: 3,
        section_title: "ARTICLE VI: MISCELLANEOUS PROVISIONS",
        verbatim_excerpt: "6.2 Entire Agreement. This Agreement constitutes the complete understanding between the parties."
      }
    ]
  },
  suggested_questions: [
    "What are the payment and invoicing deadlines?",
    "Does the agreement contain an uncapped indemnity clause?",
    "Who owns pre-existing materials and tools?",
    "How can either party terminate this agreement?"
  ],
  counsel_prep_sheet: {
    document_title: "Master Services Agreement (MSA)",
    generated_date: "September 23, 2026",
    discussion_points: [
      {
        clause_ref: "Article IV, Section 4.1",
        topic: "Uncapped IP Indemnification",
        recommended_question: "Should we request a mutual monetary cap on indemnification (e.g. capped at total fees paid under the applicable SOW) or limit it to claims arising from our gross negligence?"
      },
      {
        clause_ref: "Article III, Section 3.1 & 3.2",
        topic: "Pre-existing Background IP",
        recommended_question: "Does the current definition of 'Client Materials' and 'Work Product' sufficiently protect our reusable internal code libraries and frameworks from being automatically assigned to the client?"
      },
      {
        clause_ref: "Article V, Section 5.2",
        topic: "Liability Cap Interaction with Indemnity",
        recommended_question: "Does the aggregate liability cap in Section 5.2 carve out the indemnity obligations in Section 4.1? How can we ensure the cap applies universally?"
      },
      {
        clause_ref: "Article II, Section 2.2",
        topic: "Disputed Invoices & Late Fees",
        recommended_question: "Should we insert language clarifying that the 1.5% monthly late fee will not accrue on amounts subject to a good-faith billing dispute?"
      }
    ]
  }
};
```
