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
        id: `sec-${idx + 1}`,
        attention_level: attention,
        category,
        title: section.section_title,
        plain_english: `Section provisions under "${section.section_title}" from page ${section.page_number}.`,
        why_it_matters: `Contains operational commitments and risk allocations under ${category.toLowerCase()} provisions.`,
        page_number: section.page_number,
        section_title: section.section_title,
        verbatim_excerpt: combinedText || 'No text extracted for this section.',
        is_real_extracted: true,
      };
    });
  }

  const executiveSummaryText = analysis?.executive_summary
    ? analysis.executive_summary.high_level_overview
    : `This document contains ${response.page_count} page(s) across ${response.section_count} detected section(s). Key clauses, obligations, and risk allocations have been organized below for review.`;

  const parties = analysis?.executive_summary?.parties?.length
    ? {
        first_party: analysis.executive_summary.parties[0] || 'First Party',
        second_party: analysis.executive_summary.parties[1] || 'Counterparty',
      }
    : {
        first_party: 'Identified in Document',
        second_party: 'Counterparty',
      };

  let counselPoints: Array<{ clause_ref: string; topic: string; recommended_question: string }> = [];
  if (analysis?.counsel_discussion_points && analysis.counsel_discussion_points.length > 0) {
    counselPoints = analysis.counsel_discussion_points.map((p) => ({
      clause_ref: p.clause_ref,
      topic: p.topic,
      recommended_question: p.recommended_question,
    }));
  }

  // Supplement if fewer than 4 items
  if (counselPoints.length < 4 && clauses.length > 0) {
    const priorityClauses = clauses.filter((c) => c.attention_level === 'high' || c.attention_level === 'moderate');
    for (const item of priorityClauses) {
      if (counselPoints.length >= 6) break;
      const ref = item.section_title || `Page ${item.page_number}`;
      if (!counselPoints.some((p) => p.clause_ref === ref)) {
        counselPoints.push({
          clause_ref: ref,
          topic: `Review ${item.title}`,
          recommended_question: `What specific risk allocations or exposures should be negotiated regarding "${item.title}" (${ref})?`,
        });
      }
    }
  }

  if (counselPoints.length === 0) {
    counselPoints = response.sections.slice(0, 4).map((sec) => ({
      clause_ref: `Section ${sec.section_title}`,
      topic: `Review ${sec.section_title}`,
      recommended_question: `Review obligations and potential liability exposure under ${sec.section_title} (Page ${sec.page_number}) with counsel.`,
    }));
  }

  const suggestedQuestions = analysis?.suggested_questions?.length
    ? analysis.suggested_questions
    : [
        `What are the termination requirements in ${response.filename}?`,
        'What are the liability caps and indemnification terms?',
        'What governing law applies to this agreement?',
        'What are the confidentiality obligations?',
      ];

  return {
    id: response.document_id || `doc-${Date.now()}`,
    filename: response.filename,
    is_real_document: true,
    indexing_status: response.indexing_status,
    metadata: {
      filename: response.filename,
      document_type: analysis?.executive_summary?.document_type || 'Commercial Agreement',
      parties,
      effective_date: analysis?.executive_summary?.effective_date || 'Stated in Document',
      duration: analysis?.executive_summary?.duration || `${response.page_count} Pages`,
      financial_summary: analysis?.executive_summary?.financial_summary || 'Standard contractual terms',
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
        source: response.sections[0] ? `Page ${response.sections[0].page_number} · Section: ${response.sections[0].section_title}` : 'Extracted Document',
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
