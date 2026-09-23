import type { DocumentProcessingResponse } from '../types/document';
import type { WorkspaceDocument, ClauseFinding, ClauseCategory, AttentionLevel } from '../types/workspace';

function inferCategoryAndAttention(title: string): { category: ClauseCategory; attention: AttentionLevel } {
  const lower = title.toLowerCase();
  if (lower.includes('liabilit') || lower.includes('indemnif')) {
    return { category: 'Liability', attention: 'high' };
  }
  if (lower.includes('intellectual') || lower.includes('ip') || lower.includes('patent') || lower.includes('copyright')) {
    return { category: 'Intellectual Property', attention: 'high' };
  }
  if (lower.includes('terminat')) {
    return { category: 'Termination', attention: 'moderate' };
  }
  if (lower.includes('pay') || lower.includes('fee') || lower.includes('invoic') || lower.includes('price')) {
    return { category: 'Payment', attention: 'moderate' };
  }
  if (lower.includes('confident')) {
    return { category: 'Confidentiality', attention: 'moderate' };
  }
  if (lower.includes('governing') || lower.includes('law') || lower.includes('jurisdiction') || lower.includes('dispute')) {
    return { category: 'Governing Law', attention: 'standard' };
  }
  if (lower.includes('obligat') || lower.includes('covenant') || lower.includes('warrant')) {
    return { category: 'Obligations', attention: 'moderate' };
  }
  return { category: 'Boilerplate', attention: 'standard' };
}

export function convertRealResponseToWorkspaceDoc(response: DocumentProcessingResponse): WorkspaceDocument {
  const clauses: ClauseFinding[] = response.sections.map((section, idx) => {
    const { category, attention } = inferCategoryAndAttention(section.section_title);
    const combinedText = section.chunks.map((c) => c.text).join('\n\n');

    return {
      id: `real-sec-${idx + 1}`,
      attention_level: attention,
      category,
      title: section.section_title,
      plain_english: `Extracted legal text under "${section.section_title}". Preserved faithfully from source page ${section.page_number} with paragraph segmentation.`,
      why_it_matters: `[Phase 4 Live Extraction] Real text extracted with PyMuPDF. In Phase 5, Gemini will produce grounded commercial risk interpretations.`,
      page_number: section.page_number,
      section_title: section.section_title,
      verbatim_excerpt: combinedText || 'No text extracted for this section.',
      is_real_extracted: true,
    };
  });

  return {
    id: `real-doc-${Date.now()}`,
    filename: response.filename,
    is_real_document: true,
    metadata: {
      filename: response.filename,
      document_type: 'Live Ingested PDF',
      parties: {
        first_party: 'Disclosed in Document',
        second_party: 'Disclosed in Document',
      },
      effective_date: 'Extracted from PDF',
      duration: `${response.page_count} Pages (${response.section_count} Sections)`,
      financial_summary: `${response.chunk_count} Chunks · ${(response.file_size / 1024).toFixed(1)} KB`,
      file_size_formatted: `${(response.file_size / 1024).toFixed(1)} KB`,
      page_count: response.page_count,
      section_count: response.section_count,
      chunk_count: response.chunk_count,
    },
    executive_summary: `This document was successfully parsed via PyMuPDF into ${response.page_count} page(s), ${response.section_count} detected section(s), and ${response.chunk_count} chunk(s). All section titles, page citations, and verbatim texts below are real extracted data from your uploaded PDF. (AI risk categorization and plain-language synthesis will be enabled in Phase 5 via Gemini).`,
    clauses,
    suggested_questions: [
      `What are the termination requirements in ${response.filename}?`,
      'What are the liability caps and indemnification terms?',
      'What governing law applies to this agreement?',
      'What are the confidentiality obligations?',
    ],
    qa_database: [
      {
        id: 'qa-real-1',
        question: `What are the termination requirements in ${response.filename}?`,
        answer: '[Phase 4 Preview] Document has been sectioned and chunked. In Phase 5, Gemini will answer this using retrieved chunks from the termination section.',
        source: response.sections[0] ? `Page ${response.sections[0].page_number} · Section: ${response.sections[0].section_title}` : 'Extracted PDF',
        page_number: response.sections[0]?.page_number || 1,
      },
    ],
    counsel_prep_sheet: {
      document_title: response.filename,
      generated_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      discussion_points: response.sections.slice(0, 4).map((sec) => ({
        clause_ref: `Section ${sec.section_title}`,
        topic: `Review ${sec.section_title}`,
        recommended_question: `Review obligations and potential liability exposure under ${sec.section_title} (Page ${sec.page_number}) with counsel.`,
      })),
    },
    sections: response.sections,
    raw_chunks: response.chunks,
  };
}
