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
  const analysis = response.analysis;

  let clauses: ClauseFinding[];
  if (analysis && analysis.findings && analysis.findings.length > 0) {
    clauses = analysis.findings.map((f, i) => ({
      id: `ai-finding-${i + 1}`,
      attention_level: f.attention_level,
      category: f.category,
      title: f.title,
      plain_english: f.plain_english,
      why_it_matters: f.why_it_matters,
      page_number: f.page_number,
      section_title: f.section_title,
      verbatim_excerpt: f.verbatim_excerpt,
      is_real_extracted: true,
    }));
  } else {
    clauses = response.sections.map((section, idx) => {
      const { category, attention } = inferCategoryAndAttention(section.section_title);
      const combinedText = section.chunks.map((c) => c.text).join('\n\n');

      return {
        id: `real-sec-${idx + 1}`,
        attention_level: attention,
        category,
        title: section.section_title,
        plain_english: `Extracted legal text under "${section.section_title}". Preserved faithfully from source page ${section.page_number} with paragraph segmentation.`,
        why_it_matters: `[Real Text] Extracted directly with PyMuPDF. Evaluated under ${category} provisions.`,
        page_number: section.page_number,
        section_title: section.section_title,
        verbatim_excerpt: combinedText || 'No text extracted for this section.',
        is_real_extracted: true,
      };
    });
  }

  const executiveSummaryText = analysis?.executive_summary
    ? `${analysis.executive_summary.high_level_overview} (Parsed into ${response.page_count} pages, ${response.section_count} sections, and ${response.chunk_count} chunks with grounded citations).`
    : `This document was successfully parsed via PyMuPDF into ${response.page_count} page(s), ${response.section_count} detected section(s), and ${response.chunk_count} chunk(s). All section titles, page citations, and verbatim texts below are real extracted data from your uploaded PDF.`;

  const parties = analysis?.executive_summary?.parties?.length
    ? {
        first_party: analysis.executive_summary.parties[0] || 'First Party',
        second_party: analysis.executive_summary.parties[1] || 'Counterparty',
      }
    : {
        first_party: 'Disclosed in Document',
        second_party: 'Disclosed in Document',
      };

  const counselPoints = analysis?.counsel_discussion_points?.length
    ? analysis.counsel_discussion_points.map((p) => ({
        clause_ref: p.clause_ref,
        topic: p.topic,
        recommended_question: p.recommended_question,
      }))
    : response.sections.slice(0, 4).map((sec) => ({
        clause_ref: `Section ${sec.section_title}`,
        topic: `Review ${sec.section_title}`,
        recommended_question: `Review obligations and potential liability exposure under ${sec.section_title} (Page ${sec.page_number}) with counsel.`,
      }));

  const suggestedQuestions = analysis?.suggested_questions?.length
    ? analysis.suggested_questions
    : [
        `What are the termination requirements in ${response.filename}?`,
        'What are the liability caps and indemnification terms?',
        'What governing law applies to this agreement?',
        'What are the confidentiality obligations?',
      ];

  return {
    id: response.document_id || `real-doc-${Date.now()}`,
    filename: response.filename,
    is_real_document: true,
    metadata: {
      filename: response.filename,
      document_type: analysis?.executive_summary?.document_type || 'Live Ingested PDF',
      parties,
      effective_date: analysis?.executive_summary?.effective_date || 'Extracted from PDF',
      duration: analysis?.executive_summary?.duration || `${response.page_count} Pages (${response.section_count} Sections)`,
      financial_summary: analysis?.executive_summary?.financial_summary || `${response.chunk_count} Chunks · ${(response.file_size / 1024).toFixed(1)} KB`,
      file_size_formatted: `${(response.file_size / 1024).toFixed(1)} KB`,
      page_count: response.page_count,
      section_count: response.section_count,
      chunk_count: response.chunk_count,
    },
    executive_summary: executiveSummaryText,
    clauses,
    suggested_questions: suggestedQuestions,
    qa_database: [
      {
        id: 'qa-real-1',
        question: `What are the termination requirements in ${response.filename}?`,
        answer: 'Refer to the extracted termination clauses or ask a specific question below.',
        source: response.sections[0] ? `Page ${response.sections[0].page_number} · Section: ${response.sections[0].section_title}` : 'Extracted PDF',
        page_number: response.sections[0]?.page_number || 1,
      },
    ],
    counsel_prep_sheet: {
      document_title: response.filename,
      generated_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      discussion_points: counselPoints,
    },
    sections: response.sections,
    raw_chunks: response.chunks,
  };
}
