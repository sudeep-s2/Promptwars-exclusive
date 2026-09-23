import type { MockLegalDocument } from '../types/workspace';

export const SAMPLE_SERVICES_AGREEMENT: MockLegalDocument = {
  id: 'services-agreement',
  filename: 'sample_services_agreement.pdf',
  metadata: {
    filename: 'sample_services_agreement.pdf',
    document_type: 'Master Services Agreement (MSA)',
    parties: {
      first_party: 'Client Corp (Client)',
      second_party: 'Consulting Provider LLC (Provider)',
    },
    effective_date: 'Effective Upon Executed SOW',
    duration: 'Ongoing until terminated (30-day written notice)',
    financial_summary: 'Monthly Invoicing · Net 30 Days · 1.5% / month overdue balance interest',
    file_size_formatted: '3.01 KB',
    page_count: 3,
  },
  executive_summary:
    'This is a commercial Master Services Agreement governing engineering and consulting deliverables. ' +
    'Deliverables transfer to the client upon full payment under work-made-for-hire provisions. ' +
    'The agreement contains an uncapped indemnity clause for third-party intellectual property claims, ' +
    'while general operational liabilities are capped at the preceding 12 months of fees paid. ' +
    'Payment terms are Net 30 days with a 1.5% monthly late fee, and either party may terminate upon 30 days prior written notice.',
  clauses: [
    {
      id: 'clause-sa-01',
      attention_level: 'high',
      category: 'Liability',
      title: 'Uncapped Third-Party IP Indemnification',
      plain_english:
        'You agree to defend and pay all legal defense expenses and damages if any third party claims that your deliverables infringe their patent, copyright, or trade secret. There is no financial cap on this obligation.',
      why_it_matters:
        'Because there is no liability ceiling on this indemnity, a single patent or copyright infringement claim could expose a solo contractor or small agency to catastrophic legal costs far exceeding the total fees earned under the contract.',
      page_number: 2,
      section_title: 'ARTICLE IV: INDEMNIFICATION AND WARRANTIES',
      verbatim_excerpt:
        '4.1 Provider Indemnity. Provider shall defend and indemnify Client against any third-party claims alleging that the Deliverables infringe any valid patent, copyright, or trade secret.',
    },
    {
      id: 'clause-sa-02',
      attention_level: 'high',
      category: 'Intellectual Property',
      title: 'Work Product Ownership Transferred to Client',
      plain_english:
        "All deliverables created under any SOW become the sole property of the client upon full payment, designated as 'work made for hire.'",
      why_it_matters:
        'Ensure that your pre-existing code libraries, developer toolkits, starter templates, or generic utilities are explicitly excluded; otherwise, you could forfeit rights to reusable assets you rely on for other clients.',
      page_number: 2,
      section_title: 'ARTICLE III: INTELLECTUAL PROPERTY RIGHTS',
      verbatim_excerpt:
        "3.2 Work Product. All deliverables created specifically for Client under any SOW shall be deemed 'work made for hire' and shall become the sole property of Client upon full payment.",
    },
    {
      id: 'clause-sa-03',
      attention_level: 'moderate',
      category: 'Payment',
      title: 'Overdue Balance Interest (1.5% / Month)',
      plain_english:
        'Invoices are payable within 30 days. Overdue balances accumulate interest at 1.5% per month (18% annualized) until settled.',
      why_it_matters:
        'While 1.5% is common to incentivize timely payment, verify whether your workflow includes a mechanism to freeze interest during good-faith invoice disputes.',
      page_number: 1,
      section_title: 'ARTICLE II: COMPENSATION AND PAYMENT TERMS',
      verbatim_excerpt:
        '2.2 Invoicing. Invoices shall be rendered monthly and payable within thirty (30) days of receipt. Overdue balances accrue interest at 1.5% per month.',
    },
    {
      id: 'clause-sa-04',
      attention_level: 'moderate',
      category: 'Liability',
      title: '12-Month Trailing Liability Ceiling',
      plain_english:
        "Neither party's aggregate legal liability under the agreement can exceed the total fees paid by the client during the previous 12 months.",
      why_it_matters:
        'A 12-month cap is standard commercial protection; however, check whether the uncapped indemnity in Article IV is carved out from this cap.',
      page_number: 3,
      section_title: 'ARTICLE V: LIMITATION OF LIABILITY',
      verbatim_excerpt:
        "5.2 Aggregate Liability Cap. In no event shall either party's aggregate liability under this Agreement exceed the total fees paid by Client during the preceding twelve (12) month period.",
    },
    {
      id: 'clause-sa-05',
      attention_level: 'standard',
      category: 'Termination',
      title: 'Mutual Waiver of Consequential Damages',
      plain_english:
        'Neither party can sue the other for indirect, special, incidental, or lost-profit damages.',
      why_it_matters:
        'Standard mutual protection preventing runaway claims for speculative future business losses or market opportunity costs.',
      page_number: 3,
      section_title: 'ARTICLE V: LIMITATION OF LIABILITY',
      verbatim_excerpt:
        '5.1 Consequential Damages Waiver. Neither party shall be liable to the other for indirect, special, incidental, or consequential damages.',
    },
    {
      id: 'clause-sa-06',
      attention_level: 'standard',
      category: 'Boilerplate',
      title: 'Severability of Invalid Provisions',
      plain_english:
        'If a court invalidates any specific clause, the rest of the agreement continues in full force and effect.',
      why_it_matters:
        'Standard boilerplate that prevents a minor unenforceable clause from invalidating the entire commercial relationship.',
      page_number: 3,
      section_title: 'ARTICLE VI: MISCELLANEOUS PROVISIONS',
      verbatim_excerpt:
        '6.1 Severability. If any provision of this Agreement is held invalid, the remainder shall remain in full force and effect.',
    },
    {
      id: 'clause-sa-07',
      attention_level: 'standard',
      category: 'Boilerplate',
      title: 'Integration & Entire Agreement Clause',
      plain_english:
        'This written document supersedes all prior verbal statements, emails, pitch decks, or oral understandings.',
      why_it_matters:
        'Any verbal accommodations made during sales discussions are unenforceable unless explicitly written into this document or an executed SOW.',
      page_number: 3,
      section_title: 'ARTICLE VI: MISCELLANEOUS PROVISIONS',
      verbatim_excerpt:
        '6.2 Entire Agreement. This Agreement constitutes the complete understanding between the parties.',
    },
  ],
  suggested_questions: [
    'What are the payment deadlines?',
    'What are the termination notice requirements?',
    'Who owns created intellectual property?',
    'What obligations continue after termination?',
  ],
  qa_database: [
    {
      id: 'qa-sa-01',
      question: 'What are the payment deadlines?',
      answer:
        'Invoices are rendered on a monthly basis and are payable within thirty (30) days of receipt (Net 30). Unpaid balances accrue interest at a rate of 1.5% per month until paid in full.',
      source: 'Page 1 · ARTICLE II: COMPENSATION AND PAYMENT TERMS · Section 2.2',
      page_number: 1,
    },
    {
      id: 'qa-sa-02',
      question: 'What are the termination notice requirements?',
      answer:
        'Either party may terminate the Master Services Agreement by providing thirty (30) days prior written notice to the other party. Deliverables completed prior to the termination date become client property upon full payment.',
      source: 'Page 3 · ARTICLE VI: MISCELLANEOUS PROVISIONS · Section 6.1',
      page_number: 3,
    },
    {
      id: 'qa-sa-03',
      question: 'Who owns created intellectual property?',
      answer:
        "All deliverables created specifically for Client under any Statement of Work are deemed 'work made for hire' and become the sole property of the Client upon full payment. The Client retains ownership of all pre-existing Client Materials provided to the Provider.",
      source: 'Page 2 · ARTICLE III: INTELLECTUAL PROPERTY RIGHTS · Section 3.2',
      page_number: 2,
    },
    {
      id: 'qa-sa-04',
      question: 'What obligations continue after termination?',
      answer:
        'The indemnity obligations under Article IV and client ownership rights under Article III survive termination. The mutual waiver of consequential damages under Article V also remains binding on both parties.',
      source: 'Page 2 · ARTICLE IV · Section 4.1 & Page 3 · ARTICLE V · Section 5.1',
      page_number: 2,
    },
  ],
  counsel_prep_sheet: {
    document_title: 'Master Services Agreement (MSA)',
    generated_date: 'September 23, 2026',
    discussion_points: [
      {
        clause_ref: 'Article IV, Section 4.1 (Indemnification)',
        topic: 'Uncapped Third-Party IP Indemnity',
        recommended_question:
          'Should we request a mutual monetary ceiling on our indemnification obligations (e.g. capped at total fees received under the applicable SOW) or limit indemnity to claims arising solely from gross negligence?',
      },
      {
        clause_ref: 'Article III, Section 3.2 (Work Product)',
        topic: 'Protection of Pre-Existing Background Code',
        recommended_question:
          "Does Section 3.2 adequately preserve our ownership over our pre-existing code libraries, starter kits, and proprietary tools, or should we append a specific 'Background Technology' carve-out schedule?",
      },
      {
        clause_ref: 'Article V, Section 5.2 (Liability Cap)',
        topic: 'Carve-Out Ambiguity in Liability Ceiling',
        recommended_question:
          'Does the 12-month trailing liability cap in Section 5.2 apply universally across the entire agreement, or does the indemnity in Section 4.1 bypass this limitation under prevailing state law?',
      },
      {
        clause_ref: 'Article II, Section 2.2 (Payment Terms)',
        topic: 'Disputed Invoices and 1.5% Late Interest',
        recommended_question:
          'Can we insert language clarifying that late interest does not accrue on amounts that are the subject of a good-faith billing dispute while negotiations are ongoing?',
      },
    ],
  },
};

export const SAMPLE_NDA: MockLegalDocument = {
  id: 'mutual-nda',
  filename: 'sample_nda.pdf',
  metadata: {
    filename: 'sample_nda.pdf',
    document_type: 'Mutual Non-Disclosure Agreement (NDA)',
    parties: {
      first_party: 'Party A Inc. (Disclosing/Receiving Party)',
      second_party: 'Party B LLC (Disclosing/Receiving Party)',
    },
    effective_date: 'Date of Execution',
    duration: '3 Years from Effective Date (30-day termination notice)',
    financial_summary: 'Non-monetary mutual confidentiality covenants',
    file_size_formatted: '2.06 KB',
    page_count: 2,
  },
  executive_summary:
    'This is a mutual non-disclosure agreement between Party A Inc. and Party B LLC designed to facilitate exploratory business discussions. ' +
    'It defines Confidential Information broadly to encompass both written and oral proprietary disclosures. ' +
    'Both parties are bound to a standard of reasonable care in protecting disclosed materials and may not disclose information to third parties without prior written consent. ' +
    'The agreement has a 3-year term, allows termination on 30 days written notice, and is governed by Delaware law.',
  clauses: [
    {
      id: 'clause-nda-01',
      attention_level: 'moderate',
      category: 'Confidentiality',
      title: 'Broad Definition of Confidential Information',
      plain_english:
        'Covers all proprietary technical, operational, or business data disclosed orally or in writing. Oral disclosures must be identified as confidential.',
      why_it_matters:
        'Because the definition encompasses oral discussions, ensure that your team maintains internal logs of what is discussed during sales calls to avoid disputes over what constitutes confidential data.',
      page_number: 1,
      section_title: '1. Definitions',
      verbatim_excerpt:
        "1. Definitions. 'Confidential Information' refers to any proprietary, technical, operational, or business data disclosed by one Party to the other Party, whether orally or in tangible form, identified as confidential or proprietary.",
    },
    {
      id: 'clause-nda-02',
      attention_level: 'high',
      category: 'Obligations',
      title: 'Strict Non-Disclosure & Duty of Care',
      plain_english:
        'You must keep received confidential data in strict confidence and apply the same degree of care you apply to your own sensitive business data.',
      why_it_matters:
        'You cannot share received materials with subcontractors, advisors, or affiliates unless the disclosing party gives advance written permission.',
      page_number: 1,
      section_title: '2. Obligations of Receiving Party',
      verbatim_excerpt:
        '2. Obligations of Receiving Party. The Receiving Party agrees to hold Confidential Information in strict confidence and not to disclose such information to any third party without prior written authorization from the Disclosing Party. The Receiving Party shall apply the same degree of care as it uses for its own confidential information.',
    },
    {
      id: 'clause-nda-03',
      attention_level: 'moderate',
      category: 'Termination',
      title: '3-Year Term with 30-Day Termination Notice',
      plain_english:
        'The contract remains effective for three years. Either party can terminate early upon 30 days written notice.',
      why_it_matters:
        'Termination ends the exchange of new confidential information, but confidentiality obligations for previously received data continue throughout the 3-year window.',
      page_number: 2,
      section_title: '3. Term and Termination',
      verbatim_excerpt:
        '3. Term and Termination. This Agreement shall remain in effect for a period of three (3) years from the Effective Date. Either party may terminate this Agreement upon thirty (30) days prior written notice to the other party.',
    },
    {
      id: 'clause-nda-04',
      attention_level: 'standard',
      category: 'Governing Law',
      title: 'Governing Law (State of Delaware)',
      plain_english:
        'Any dispute arising out of this agreement will be decided under the substantive laws of Delaware courts.',
      why_it_matters:
        'Delaware is the standard commercial jurisdiction with well-established corporate contract precedents.',
      page_number: 2,
      section_title: '4. Governing Law and Jurisdiction',
      verbatim_excerpt:
        '4. Governing Law and Jurisdiction. This Agreement shall be governed by and construed in accordance with the substantive laws of the State of Delaware, without regard to its conflict of law principles.',
    },
  ],
  suggested_questions: [
    'What are the termination notice requirements?',
    'What is considered confidential information?',
    'What is the term of this agreement?',
    'Which state laws govern this agreement?',
  ],
  qa_database: [
    {
      id: 'qa-nda-01',
      question: 'What are the termination notice requirements?',
      answer:
        'Either party may terminate the NDA upon thirty (30) days prior written notice to the other party. Confidentiality duties for previously received information survive until the 3-year term expires.',
      source: 'Page 2 · 3. Term and Termination',
      page_number: 2,
    },
    {
      id: 'qa-nda-02',
      question: 'What is considered confidential information?',
      answer:
        "'Confidential Information' refers to any proprietary, technical, operational, or business data disclosed by one Party to the other Party, whether orally or in tangible form, identified as confidential or proprietary.",
      source: 'Page 1 · 1. Definitions',
      page_number: 1,
    },
    {
      id: 'qa-nda-03',
      question: 'What is the term of this agreement?',
      answer:
        'The Agreement remains in effect for a period of three (3) years from the Effective Date, unless terminated earlier by 30 days written notice.',
      source: 'Page 2 · 3. Term and Termination',
      page_number: 2,
    },
    {
      id: 'qa-nda-04',
      question: 'Which state laws govern this agreement?',
      answer:
        'The Agreement is governed by and construed in accordance with the substantive laws of the State of Delaware, without regard to its conflict of law principles.',
      source: 'Page 2 · 4. Governing Law and Jurisdiction',
      page_number: 2,
    },
  ],
  counsel_prep_sheet: {
    document_title: 'Mutual Non-Disclosure Agreement (NDA)',
    generated_date: 'September 23, 2026',
    discussion_points: [
      {
        clause_ref: 'Section 1 (Definitions)',
        topic: 'Standard Exclusions from Confidential Information',
        recommended_question:
          'Should we ensure the NDA explicitly excludes information that was already publicly known, independently developed without reference to the disclosures, or rightfully obtained from third parties?',
      },
      {
        clause_ref: 'Section 2 (Permitted Disclosures)',
        topic: 'Carve-outs for Professional Advisors and Subcontractors',
        recommended_question:
          'Can we add a standard exception permitting disclosure to our certified accountants, legal counsel, and banking partners without requiring advance written consent?',
      },
      {
        clause_ref: 'Section 3 (Term and Survival)',
        topic: 'Post-Termination Confidentiality Duration',
        recommended_question:
          'Does the 3-year term mean that after year 3 all confidential information can be freely disclosed, or should trade secrets have an indefinite protection period?',
      },
    ],
  },
};

export const MOCK_DOCUMENTS: Record<string, MockLegalDocument> = {
  'sample_services_agreement.pdf': SAMPLE_SERVICES_AGREEMENT,
  'sample_nda.pdf': SAMPLE_NDA,
};
