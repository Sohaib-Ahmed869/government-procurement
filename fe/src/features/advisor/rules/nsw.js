/* ===== src/rules.nsw.js ===== */
/* =============================================================================
 * NSW rule pack — Procurement Approach Advisor
 * -----------------------------------------------------------------------------
 * Everything the engine knows about NSW lives in this file. It is deliberately
 * data-first so it can be updated without touching engine.js.
 *
 * HOW TO UPDATE WHEN POLICY CHANGES
 *   1. Edit the value in THRESHOLDS (or the relevant rule text).
 *   2. Update `asAt` on the source entry you relied on.
 *   3. Bump RULESET.version and add a line to docs/RULE-SOURCES.md.
 *
 * CONFIDENCE
 *   Every finding carries a confidence value:
 *     'high'   — threshold or obligation confirmed against an official source.
 *     'medium' — correct in substance, but the exact figure/clause should be
 *                confirmed against the source before you rely on it.
 *     'low'    — directional only; the rule is discretionary, under review, or
 *                depends on your own instrument (policy, delegation, contract).
 *     'judgement' — NOT a confidence level. This finding is the tool's own
 *                recommendation, not a policy rule, so there is no source to
 *                confirm it against. Sourced definitions it relies on are still
 *                cited. Never relabel a 'medium' as 'judgement' to make the
 *                output look better — they mean different things.
 * ========================================================================== */

let PACK;

(function () {

  /* ---------------------------------------------------------------------------
   * Sources. Every rule points at one or more of these by key.
   * ------------------------------------------------------------------------ */
  var SOURCES = {
    pwpa: {
      title: 'Public Works and Procurement Act 1912 (NSW), Part 11',
      note: 'Establishes the NSW Procurement Board; s 176 obliges government agencies to procure in accordance with Board directions and policies, the terms of their accreditation, and the principles of probity and fairness. s 162 excludes State owned corporations from "government agency" unless prescribed by regulation.',
      url: 'https://legislation.nsw.gov.au/view/whole/html/inforce/current/act-1912-045',
      asAt: '2026-08-02'
    },
    ppf: {
      title: 'NSW Government Procurement Policy Framework',
      note: 'The umbrella framework for NSW government agency procurement of goods and services.',
      url: 'https://www.info.buy.nsw.gov.au/policy-library/policies/procurement-policy-framework',
      asAt: '2026-08-02'
    },
    pbd2021_04: {
      title: 'PBD-2021-04 Approved procurement arrangements',
      note: 'Issued 23 November 2021, mandatory. Sets the approved arrangements for agency procurement of any kind, requires Ministerial approval before entering whole-of-government contracts, and contains the Exceptions Framework for not using mandatory whole-of-government arrangements. Any agency may contract any supplier for goods and services valued up to $10,000 even where the goods or services are available on a whole-of-government arrangement.',
      url: 'https://arp.nsw.gov.au/pbd-2021-04-approved-procurement-arrangements',
      asAt: '2026-08-02'
    },
    accreditation: {
      title: 'Accreditation for goods and services procurement (buy.nsw)',
      note: 'There are two accreditation levels, and the difference between them is material. Level 1 carries a staggered risk- and spend-based maximum contract value (MCV) and must seek concurrence above it. Level 2 has no prescribed MCV at all. Unaccredited agencies may procure low-value contracts but need assurance from an accredited agency or NSW Procurement above that.',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/get-started/accreditation/goods-and-services-accreditation',
      asAt: '2026-08-02',
      quotes: [{
        text: 'Agencies can attain one of two accreditation levels, with each level having specific minimum requirements for accreditation and a different authority threshold to procure.',
        section: 'Accreditation for goods and services procurement',
        page: null
      }, {
        text: 'Level 2 accredited agencies have no prescribed MCV and are expected to play a leadership and concurrence role within their portfolio. They may undertake all procurement events in line with their approved budgets, financial and procurement delegations.',
        section: 'Accreditation levels, Level 2',
        page: null
      }, {
        text: 'Level 1 accredited agencies must adhere to a staggered risk and spend-based MCV and must seek concurrence when they exceed their MCV threshold.',
        section: 'Accreditation levels, Level 1',
        page: null
      }, {
        text: 'Unaccredited agencies are authorised to procure low-value contracts, but will require assurance from an accredited agency or NSW Procurement for contracts of higher values.',
        section: 'Accreditation, unaccredited agencies',
        page: null
      }]
    },
    accreditationProgram: {
      title: 'Accreditation Program Requirements for Goods and Services Procurement',
      url: 'https://www.info.buy.nsw.gov.au/policy-library/policies/accreditation-program-goods-and-services-procurement',
      asAt: '2026-08-02',
      quotes: [{
        text: 'The authority to procure is defined through the maximum contract value (MCV), which is the dollar contract value up to which accredited agencies can undertake their own procurement activity without seeking concurrence.',
        section: 'Authority to procure',
        page: null
      }, {
        text: 'Level 1 accredited agencies may play a concurrence role for unaccredited agencies within their portfolio in line with their authority to procure.',
        section: 'Concurrence',
        page: null
      }]
    },
    level1DecisionTree: {
      title: 'Decision tree for level 1 agencies to assess risks (buy.nsw)',
      note: 'Level 1 agencies use this to set a risk-based MCV for individual high-value procurements.',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/get-started/accreditation/goods-and-services-accreditation/decision-tree-for-level-1-agencies-to-assess-risks',
      asAt: '2026-08-02',
      quotes: [{
        text: 'Where a procurement event is valued more than $20 million, level 1 accredited agencies are required to determine their risk based MCV using a decision tree. Nine key questions are used to assess the procurement-specific risks of the event.',
        context: 'A high risk procurement event carries a $20 million MCV.',
        section: 'Decision tree for level 1 agencies to assess risks',
        page: null
      }]
    },
    lowValue: {
      title: 'Low-value contracts (buy.nsw)',
      note: 'Value bands for unaccredited agencies: under $10,000 buy from any supplier provided rates are reasonable and consistent with normal market rates; $10,000-$30,000 obtain at least one written quotation; $30,000-$680,000 obtain at least three written quotations, or conduct an appropriate procurement process approved by the agency head or an accredited agency within the cluster.',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/source/select-suppliers/low-value-contracts',
      asAt: '2026-08-02'
    },
    contractLimits: {
      title: 'Maximum contract values / contract limits (buy.nsw)',
      note: 'Agency-specific contract limits set by accreditation.',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/plan/before-you-approach-the-market/contract-limits',
      asAt: '2026-08-02'
    },
    pbd2019_05: {
      title: 'PBD-2019-05 Enforceable procurement provisions',
      note: 'Implements NSW obligations under international procurement agreements (WTO GPA, CPTPP and others). Applies to the agencies listed in Schedule 2. A covered agency must comply for construction valued at or above $9,584,000 ex GST and goods and other services at or above $680,000 ex GST. In estimating value an agency must include the goods and services, any options, extensions or renewals, all remuneration including premiums, fees, interest and commissions, and all revenue streams provided for in the contract. Clause 15 sets the exhaustive grounds for limited tendering; amended 11 July 2025 to align cl 15(1)(e) with the Commonwealth Procurement Rules.',
      url: 'https://arp.nsw.gov.au/pbd-2019-05-enforceable-procurement-provisions',
      asAt: '2026-08-02'
    },
    eppGuidance: {
      title: 'Enforceable procurement provisions, buyer guidance (buy.nsw)',
      note: 'Practical guidance on covered procurement thresholds, minimum tender periods and limited tendering.',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/plan/before-you-approach-the-market/enforceable-procurement-provisions',
      asAt: '2026-08-02',
      quotes: [{
        text: 'Agencies must generally use an open approach to market for covered procurements. Agencies must publish open approaches to market on buy NSW Tenders.',
        section: 'Enforceable procurement provisions guidance',
        page: null
      }, {
        text: 'For covered procurements, agencies can reduce the tender period to 10 calendar days, so long as they’ve included the procurement in their annual procurement plan and suppliers still have enough time to prepare and price their submissions.',
        context: 'The reduction requires the goods or services to be commercial items routinely sold to business for non-government purposes, an open approach published within the previous 12 months for substantially similar goods or services, and a notice in an annual procurement plan published on Tenders at least 40 days before the open approach.',
        section: 'Run the tender process, tender periods',
        page: null
      }]
    },
    tenderProcess: {
      title: 'Run the tender process (buy.nsw buyer guidance)',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/source/notify-and-brief-the-market/run-tender-process',
      asAt: '2026-08-02',
      quotes: [{
        text: 'The minimum period for a tender will depend largely on whether or not you’re engaging in a covered procurement, as well as how you’re approaching the market.',
        section: 'Run the tender process',
        page: null
      }, {
        text: '25 calendar days is recommended in any situation where you publish the tender on buy NSW Tenders.',
        context: 'A recommendation, not a floor, the binding minimum for a covered procurement comes from PBD-2019-05.',
        section: 'Run the tender process, tender periods',
        page: null
      }]
    },
    pbd2025_03: {
      title: 'PBD-2025-03 Mandated use of the ICT Purchasing Framework',
      note: 'Issued October 2025; supersedes PBD-2021-02, which is archived. The mandate to use the ICT Purchasing Framework continues under this direction.',
      url: 'https://arp.nsw.gov.au/pbd-2025-03-mandated-use-of-ict-purchasing-framework',
      asAt: '2026-08-04'
    },
    pbd2026_01: {
      title: 'PBD-2026-01 Approved procurement arrangements for the ICT Services Scheme',
      note: 'Dated 20 February 2026; the current ICT direction, superseding PBD-2025-01. Sets mandatory thresholds and processes for procuring ICT related goods and services (other than ICT consultancy), and separate mandatory thresholds and processes for ICT consultancy services, with additional conditions and governance where an ICT consultancy engagement does not comply with the ICT Consulting Commercial Framework. Applies to government agencies within the meaning of the Public Works and Procurement Act 1912. Regardless of accreditation level or engagement value, ICT consultancy engagements must also comply with the current professional services direction.',
      url: 'https://arp.nsw.gov.au/pbd-2026-01-approved-procurement-arrangements-for-the-ict-services-scheme',
      asAt: '2026-08-02'
    },
    pbd2026_02: {
      title: 'PBD-2026-02 Engagement of professional services suppliers',
      note: 'The current professional services direction, latest in the chain PBD-2021-03 > PBD-2023-05 / PBD-2023-06 > PBD-2025-02 > PBD-2026-02. Applies to procurement of services by or for a government agency within the meaning of the Public Works and Procurement Act 1912. The specific approval and reporting thresholds could not be read from the primary document in this environment.',
      url: 'https://arp.nsw.gov.au/pbd-2026-02-engagement-of-professional-services-suppliers',
      asAt: '2026-08-02'
    },
    pbd2026_03: {
      title: 'PBD-2026-03 KPMG Procurement Restrictions',
      note: 'Issued 17 June 2026, mandatory. Suspends new procurements involving KPMG and establishes an approval and reporting process for engagements under existing in-flight procurements and for extensions, renewals or variations of existing engagements. Applies to Executive agencies, Separate agencies, Statutory Authorities/Bodies and NSW Government subsidiaries established under the Corporations Act. Attachment A lists the covered KPMG entities.',
      url: 'https://arp.nsw.gov.au/pbd-2026-03-kpmg-procurement-restrictions',
      asAt: '2026-08-02',
      quotes: [{
        text: 'PBD-2026-03 suspends new procurements involving KPMG and establishes an approval and reporting process for certain engagements.',
        context: 'Issued 17 June 2026. The suspension covers new procurements, and the approval and reporting process covers engagements under existing in-flight procurements and extensions, renewals or variations of existing engagements. Attachment A lists the covered KPMG entities.',
        section: 'PBD-2026-03 KPMG Procurement Restrictions',
        page: null
      }]
    },
    pbd2025_04: {
      title: 'PBD-2025-04 Mandate for publication of NSW Government open tender opportunities on buy.nsw',
      note: 'Applies to all government agencies within the meaning of the Public Works and Procurement Act 1912.',
      url: 'https://arp.nsw.gov.au/pbd-2025-04-procurement-board-direction-2025-04-mandate-for-the-publication-of-nsw-government-open-tender-opportunities-on-buy-nsw',
      asAt: '2026-08-02',
      quotes: [{
        text: 'The direction mandates the publication of all NSW Government open tender opportunities irrespective of the value on buy NSW. Agencies will have up to 1 July 2026 to comply with this Direction.',
        section: 'PBD-2025-04',
        page: null
      }]
    },
    pbd2023_04: {
      title: 'PBD-2023-04 Mandated registration of all NSW Government suppliers on the buy.nsw Supplier Hub',
      url: 'https://arp.nsw.gov.au/pbd-2023-04-mandated-registration-of-all-nsw-government-suppliers-on-the-buy-nsw-supplier-hub',
      asAt: '2026-08-02'
    },
    sme: {
      title: 'NSW Small and Medium Enterprise (SME) and Regional Procurement Policy',
      note: 'Direct engagement ceilings differ by supplier type: goods and services (excluding construction) may be bought directly from a regional business up to $150,000, and from an SME up to $250,000. The SME ceiling was raised from $150,000 to $250,000 in 2023. At $3 million and above, minimum allocations apply, each expressed as a share OF THE NON-PRICE criteria, not of the total evaluation. CAUTION: the policy text reads as two separate 10% minimums (SME participation, and government priorities), but 2024 reform commentary describes a combined minimum 15% non-price weighting for government priorities OF WHICH 10% is SME participation. The two readings give different totals (20% vs 15%). Confirm the current PPF/SME-RPP wording before locking weightings. SME = Australian or New Zealand based enterprise with fewer than 200 FTE employees.',
      url: 'https://www.info.buy.nsw.gov.au/policy-library/policies/sme-and-regional-procurement-policy',
      asAt: '2026-08-02',
      quotes: [{
        text: 'agencies must apply a minimum 10% of the non-price evaluation criteria to assess how suppliers will support SME participation, and must also apply a minimum 10% of the non-price evaluation criteria to assess how suppliers will support the government’s economic (including local content), ethical, environmental and social priorities',
        context: 'Applies to goods and services contracts over $3 million.',
        section: 'SME and Regional Procurement Policy / Support SMEs and regional businesses',
        page: null
      }, {
        text: 'For contracts valued at $3 million or more, suppliers are required to submit an SME and local participation plan, referencing SME and NSW specific content, consistent with International Procurement Agreement (IPA) obligations, and report on these commitments quarterly.',
        section: 'Support SMEs and regional businesses',
        page: null
      }, {
        text: 'Up to $150,000, you can buy goods and services directly from a regional business. That limit goes up to $250,000 for SMEs.',
        section: 'Support SMEs and regional businesses',
        page: null
      }]
    },
    evalCriteria: {
      title: 'Tender evaluation criteria (buy.nsw buyer guidance)',
      note: 'Guidance on setting price and non-price evaluation criteria and their relative weightings.',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/source/select-suppliers/evaluation-criteria',
      asAt: '2026-08-02',
      quotes: [{
        text: 'For procurements subject to the Enforceable procurement provisions, agencies must indicate the relative importance (or weight) of their evaluation criteria.',
        section: 'Tender evaluation criteria',
        page: null
      }]
    },
    marketApproaches: {
      title: 'Traditional market approaches (buy.nsw buyer guidance)',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/plan/approach-the-market/traditional',
      asAt: '2026-08-02',
      quotes: [{
        text: 'Traditional approaches include requests for quotes (RFQs), requests for tender (RFTs), expressions of interest (EOIs), limited tenders, and a process called best and final offers.',
        section: 'Traditional market approaches',
        page: null
      }, {
        text: 'In a request for quote (RFQ), an agency asks you to provide a price quote for specific goods or services.',
        section: 'Traditional market approaches, Request for quote',
        page: null
      }, {
        text: 'An RFT or open tender is one that is publicly advertised. In an open RFT, anybody can submit a tender response.',
        section: 'Traditional market approaches, Request for tender',
        page: null
      }, {
        text: 'You use an EOI to find out whether suppliers are both capable of performing the specific work and interested in undertaking it. Typically, an EOI only elicits responses to a broad set of criteria. It rarely includes definitive solutions or final costs. For that reason, you don’t need to include price criteria and you ultimately don’t award a contract.',
        section: 'Traditional market approaches, Expression of interest',
        page: null
      }, {
        text: 'A request for proposal (RFP) is used when the government agency knows the final outcome it wants, but it’s not sure what the best solution is for providing it. It will ask suppliers for a proposal on how they’d solve the problem. It may also include criteria which it will use to evaluate your expertise, experience and capacity to deliver.',
        section: 'Request for proposal',
        page: null
      }]
    },
    multiStage: {
      title: 'Multi-stage market approaches (buy.nsw buyer guidance)',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/plan/approach-the-market/multi-stage-market-approaches',
      asAt: '2026-08-02',
      quotes: [{
        text: 'An example of a multi-stage approach could include going to market with an expression of interest (EOI) to gauge whether any suppliers can, in fact, meet your needs. Once you confirm your market options, you may then select a shortlist of suppliers to move forward into a more specific and detailed selective request for tender (selective RFT).',
        section: 'Multi-stage market approaches',
        page: null
      }]
    },
    micta: {
      title: 'MICTA/ICTA contracting framework (buy.nsw)',
      note: 'The contract document set for high-risk or high-value ICT. Replaces Procure IT version 3.2.',
      url: 'https://www.info.buy.nsw.gov.au/resources/micta-icta',
      asAt: '2026-08-02',
      quotes: [{
        text: 'The MICTA/ICTA Contracting Framework refers to the set of contract documents used when buying high-risk or high-value (over $1 million) ICT goods and services on behalf of NSW Government.',
        section: 'MICTA/ICTA contracting framework',
        page: null
      }, {
        text: 'The MICTA replaces the Head Agreement under Procure IT. The MICTA can be used to establish a standing offer arrangement for the procurement of ICT Deliverables and Services on the terms and conditions of the ICTA. The ICTA is functionally equivalent to the Customer Contract under Procure IT.',
        section: 'MICTA/ICTA contracting framework',
        page: null
      }, {
        text: 'If the only Services being procured is hardware Support Services, Customers should use the Hardware and Other ICT Deliverables Module.',
        section: 'MICTA/ICTA user guide, module selection',
        page: null
      }, {
        text: 'If the Customer is procuring software support Services for software other than Licensed Software, the Customer should use the Services (Non-Cloud) Module. If the Customer is procuring software development Services, the Supplier should use the Services Module (Non-Cloud), which includes specific provisions relating to the development of software.',
        section: 'MICTA/ICTA user guide, module selection',
        page: null
      }]
    },
    industryEngagement: {
      title: 'Methods of industry engagement (buy.nsw buyer guidance)',
      note: 'Industry engagement, including a request for information, industry briefings and product demonstrations, happens before the approach to market. It is not itself an approach to market and does not lead to a contract award.',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/plan/industry-engagement/types',
      asAt: '2026-08-02'
    },
    smeGuidance: {
      title: 'Support SMEs and regional businesses (buy.nsw buyer guidance)',
      note: 'Confirms the split ceilings ($150,000 regional, $250,000 SME) and the $3 million participation plan and evaluation weighting requirements.',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/source/select-suppliers/supporting-smes',
      asAt: '2026-08-02'
    },
    app: {
      title: 'NSW Aboriginal Procurement Policy (APP)',
      note: 'Applies to the procurement of all goods and services and construction, with no exempt categories. Agencies may negotiate directly with an Aboriginal business for procurements up to $250,000. NOTE THE MODAL VERBS: first consideration up to $250,000 is a "should whenever feasible"; applying an Aboriginal participation non-price evaluation criterion is a "should"; the 1.5% minimum participation requirement at $7.5 million and above is a "must". Policy targets: at least 3% of the total number of the government\'s goods and services contracts awarded to Aboriginal businesses, and 1% of each cluster\'s addressable spend.',
      url: 'https://www.info.buy.nsw.gov.au/policy-library/policies/aboriginal-procurement-policy',
      asAt: '2026-08-02',
      quotes: [{
        text: 'Agencies should apply an Aboriginal participation non-price evaluation criterion, so that responses may also be evaluated on their social commitments.',
        context: 'A "should", not a "must", recommended practice rather than a mandatory criterion, and the policy fixes no percentage for it.',
        section: 'Aboriginal Procurement Policy',
        page: null
      }, {
        text: 'Agencies should whenever feasible give first consideration to Aboriginal businesses for procurements up to $250,000. Additionally, agencies may directly negotiate with an Aboriginal business for procurements up to $250,000.',
        section: 'Aboriginal Procurement Policy',
        page: null
      }, {
        text: 'For contracts valued at $7.5 million or above, agencies must include minimum requirements for 1.5% Aboriginal participation, which can be addressed by one or a combination of the following: at least 1.5% of the contract value must be subcontracted to Aboriginal businesses, at least 1.5% of the contract\u2019s Australian based workforce (FTE) that directly contribute to the contract must be Aboriginal employees, or at least 1.5% of the contract value must be applied to the cost of education, training, or capability-building for Aboriginal staff or businesses directly contributing to the contract.',
        context: 'This one IS mandatory. Three alternative mechanisms, and they may be combined.',
        section: 'Aboriginal Procurement Policy',
        page: null
      }, {
        text: 'When Aboriginal participation is required, tenderers must submit an Aboriginal Participation Plan during the procurement process that sets out how the tenderer plans to meet the Aboriginal participation requirements.',
        section: 'Aboriginal Procurement Policy',
        page: null
      }, {
        text: 'The APP applies to the procurement of all goods and services and construction with no exempt categories.',
        section: 'Aboriginal Procurement Policy',
        page: null
      }]
    },
    ade: {
      title: 'Social outcomes and sustainability, Australian Disability Enterprises (buy.nsw)',
      note: 'Government may buy from an Australian Disability Enterprise at any contract value, provided a quote is obtained and value for money can be demonstrated.',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/before-you-buy/procurement-objectives/social-outcomes-and-sustainability',
      asAt: '2026-08-02'
    },
    schemeIct: {
      title: 'SCM0020 Prequalification Scheme: ICT Services',
      url: 'https://buy.nsw.gov.au/scheme/6B1F91AE-B3CC-0F0E-17267D5EF7BCEB9E',
      asAt: '2026-08-02',
      quotes: [{
        text: 'NSW Government agencies and other eligible buyers must use suppliers from the ICT Services Scheme (SCM0020) when buying ICT/digital goods and services.',
        context: 'Mandated by Procurement Board Direction; use of the scheme is not optional for agency ICT procurement.',
        section: 'ICT Services Scheme',
        page: null
      }]
    },
    schemePms: {
      title: 'SCM0005 Prequalification Scheme: Performance and Management Services',
      url: 'https://buy.nsw.gov.au/scheme/5686462E-F515-F34D-DF4D7C89274AD889',
      asAt: '2026-08-02'
    },
    fasterPayment: {
      title: 'Faster Payment Terms Policy',
      note: 'In-scope NSW Government agencies must pay registered small businesses within 5 business days of a correctly rendered invoice, for invoices up to $1 million. Small business = Australian or New Zealand based, fewer than 20 FTE employees, not a subsidiary of or connected to a medium or large business, and registered on the buy.nsw Supplier Hub.',
      url: 'https://www.info.buy.nsw.gov.au/policy-library/policies/faster-payment-terms',
      asAt: '2026-08-04',
      quotes: [{
        text: 'NSW Government agencies must pay registered small businesses within 5 business days of receipt of a correctly rendered invoice, for invoices up to $1 million.',
        context: 'The supplier must meet the small business definition and be registered on the buy.nsw Supplier Hub for the 5-day terms to apply.',
        section: 'Faster Payment Terms Policy',
        page: null
      }]
    },
    shorterPayment: {
      title: 'Small Business Shorter Payment Terms Policy',
      note: 'From 1 July 2021. For goods or services contracts with a large business valued at $7.5 million or above, the agency must require the head contractor to identify direct small business subcontractors, tell them about the policy, put 20-business-day payment terms in their subcontracts, and pay them within 20 business days of a correctly rendered invoice. This is a contract-design obligation the buyer must build into the head contract.',
      url: 'https://www.info.buy.nsw.gov.au/policy-library/policies/small-business-shorter-payment-terms-policy',
      asAt: '2026-08-04',
      quotes: [{
        text: 'For goods or services contracts with a large business with a contract value of $7.5 million or above, a NSW Government agency must require the large business to include in its subcontracts with small business subcontractors a requirement to make payments within 20 business days following receipt of a correctly rendered invoice.',
        section: 'Small Business Shorter Payment Terms Policy',
        page: null
      }]
    },
    gipa: {
      title: 'Government Information (Public Access) Act 2009 (NSW), register of government contracts',
      note: 'All contracts valued at $150,000 (incl GST) or more must be disclosed within 45 working days of coming into effect. Class 1: any contract of $150,000 or more incl GST. Class 2: a contract between $150,000 and $5 million incl GST that was not awarded as the result of a tender process, or that was awarded from a tender whose terms were substantially negotiated with the successful bidder. Class 3: a class 2 contract with an estimated whole-of-life value of $5 million or more incl GST, a copy of the contract itself must be published. NOTE: the class 2 limbs listed here are the ones relevant to goods and services; GIPA Act s 27 has further limbs (private financing/operation of infrastructure, significant asset transfers) that mostly arise in construction, which is out of scope for this pack.',
      url: 'https://www.procurepoint.nsw.gov.au/policy-and-reform/nsw-government-procurement-information/public-disclosure-contracts',
      asAt: '2026-08-02',
      quotes: [{
        text: 'All contracts over $150,000 including GST must be disclosed within 45 working days of coming into effect.',
        context: 'Class 2 is a contract between $150,000 and $5 million incl GST not awarded through a tender process, or awarded from a tender whose terms were substantially negotiated with the successful bidder. A class 2 contract of $5 million or more incl GST is class 3 and the contract itself must be published.',
        section: 'Public disclosure of contracts',
        page: null
      }]
    },
    modernSlavery: {
      title: 'Modern Slavery Act 2018 (NSW)',
      note: 'NSW government agencies, local councils and State owned corporations must take reasonable steps to ensure goods and services procured are not the product of modern slavery. For councils the obligation commenced 1 July 2022, with an annual report statement required from 2022/23 under s 428(4) of the Local Government Act 1993.',
      url: 'https://dcj.nsw.gov.au/legal-and-justice/our-commissioners/anti-slavery-commissioner/due-diligence-and-reporting.html',
      asAt: '2026-08-02',
      quotes: [{
        text: 'Local councils are required to take reasonable steps to ensure that the goods and services they procure are not the product of modern slavery, and to report on those steps.',
        section: 'Due diligence and reporting',
        page: null
      }, {
        text: 'Commencing from the 2022/23 financial year, each council must publish in their annual reports a statement of steps taken to ensure that goods and services procured by and for the council during the year were not the product of modern slavery within the meaning of the Modern Slavery Act 2018 (NSW).',
        context: 'The annual report obligation sits in s 428(4) of the Local Government Act 1993.',
        section: 'Councils\u2019 obligations',
        page: null
      }]
    },
    reasonableSteps: {
      title: 'Guidance on Reasonable Steps (NSW Anti-slavery Commissioner)',
      note: 'Operative 1 January 2024. From 1 July 2024, an online report must be filed with the Office of the Anti-slavery Commissioner within 45 days of the entry into force of any contract arising from a "heightened" modern slavery due diligence procurement process valued at $150,000 including GST or more.',
      url: 'https://dcj.nsw.gov.au/documents/legal-and-justice/anti-slavery-commissioner/due-diligence-and-reporting/guidance-on-reasonable-steps.pdf',
      asAt: '2026-08-02',
      quotes: [{
        text: 'From 1 July 2024, councils must file an online report with the Office of the Anti-slavery Commissioner within 45 days of the entry into force of any contract arising from a \u2018heightened\u2019 modern slavery due diligence procurement process with a value of AUD $150,000 (including GST) or more.',
        context: 'The Guidance on Reasonable Steps became operative on 1 January 2024.',
        section: 'Guidance on Reasonable Steps',
        page: null
      }]
    },
    cyber: {
      title: 'NSW Cyber Security Policy',
      note: 'Procuring agencies must consider the protective marking of their data, implement security controls matching the data classification, and risk-assess third party/supplier access, storage and maintenance of government data.',
      url: 'https://www.digital.nsw.gov.au/policy',
      asAt: '2026-08-02'
    },
    iaf: {
      title: 'ICT Assurance Framework (Digital NSW)',
      note: 'Applies to State capital and recurrent funded ICT projects valued at $5 million and above delivered by General Government agencies, Government Businesses and State Owned Corporations.',
      url: 'https://www.digital.nsw.gov.au/policy/ict-assurance/about-ict-assurance-framework',
      asAt: '2026-08-02'
    },
    sustainability: {
      title: 'Social outcomes and sustainability in NSW procurement',
      note: 'Sustainability/social procurement objectives, and the Climate Change (Net Zero Future) Act 2023 (NSW).',
      url: 'https://www.info.buy.nsw.gov.au/buyer-guidance/before-you-buy/procurement-objectives/social-outcomes-and-sustainability',
      asAt: '2026-08-02'
    },
    supplierCode: {
      title: 'NSW Government Supplier Code of Conduct',
      url: 'https://www.info.buy.nsw.gov.au/policy-library/policies/supplier-code-of-conduct',
      asAt: '2026-08-02'
    },
    concurrence: {
      title: 'NSW Procurement Concurrence Policy',
      note: 'Sets out when an agency must obtain concurrence from NSW Procurement before proceeding.',
      url: 'https://www.info.buy.nsw.gov.au/policy-library/policies/nswp-concurrence-policy',
      asAt: '2026-08-02'
    },
    lga55: {
      title: 'Local Government Act 1993 (NSW), s 55, Requirements for tendering',
      note: 's 55(1) lists the contracts a council must tender for. s 55(3) lists the exemptions, including s 55(3)(n)(i): estimated expenditure or receipt of less than $250,000 (or another prescribed amount). Per the OLG procurement guidelines the prescribed $250,000 threshold is the estimated expenditure under the proposed contract and is INCLUSIVE of GST. s 55(3)(n) also carries the lower limb for services currently provided by council employees: less than $150,000 (or another amount prescribed by the regulations). The Act does not state GST treatment for the $150,000 limb; the OLG GST-inclusive gloss is confirmed only for the $250,000 limb, so its application to the lower limb is a conservative assumption, not a sourced fact.',
      url: 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1993-030#sec.55',
      asAt: '2026-08-04',
      quotes: [{
        text: 'Section 55(3)(n)(i) of the Act currently exempts from the tendering requirements a contract involving an estimated expenditure of an amount of less than $250,000.',
        section: 'Local Government Act 1993, s 55(3)(n)(i)',
        page: null
      }, {
        text: 'a contract involving an estimated expenditure or receipt of an amount of less than $150,000 or another amount as may be prescribed by the regulations, where those services are, at the time of entering the contract, being provided by employees of the council',
        context: 'The staff-services limb of s 55(3)(n), the source of the $150,000 alternative threshold. Verified against the current consolidated Act.',
        section: 'Local Government Act 1993, s 55(3)(n)',
        page: null
      }, {
        text: 'The prescribed threshold value is $250,000, which is the estimated expenditure under the proposed contract, and is inclusive of goods and services tax (GST).',
        context: 'This is why an ex-GST figure just under $250,000 can still be over the threshold.',
        section: 'OLG procurement guidelines, tendering threshold',
        page: null
      }]
    },
    lgTendering: {
      title: 'Tendering Guidelines for NSW Local Government (Office of Local Government)',
      url: 'https://www.olg.nsw.gov.au/sites/default/files/2026-02/tendering-guidelines-for-nsw-local-government-2009.pdf',
      asAt: '2026-08-02',
      quotes: [{
        text: 'NSW councils must choose between three tendering methods: open tendering by public advertisement, selective tendering following public advertisement asking for expressions of interest, and selective tendering using recognised contractors selected from a council-prepared list.',
        section: 'Tendering methods',
        page: null
      }, {
        text: 'The deadline for submission must be a specified time on a date that is at least 21 days after the date of publication or first publication of the advertisement.',
        context: 'Applies to both tenders and expressions of interest. Under the Interpretation Act the day of publication is excluded from the reckoning of the 21 days.',
        section: 'Advertising period',
        page: null
      }]
    },
    lgReg: {
      title: 'Local Government (General) Regulation 2021 (NSW), tendering',
      note: 'Prescribes tendering methods (open tendering; selective tendering by inviting expressions of interest; selective tendering from a list of recognised persons), plus advertising and evaluation requirements. An earlier note here marked the $150,000 staff-services threshold NOT CONFIRMED after searching this Regulation for it, it was being sought in the wrong instrument. The figure sits in the Act itself: LG Act s 55(3)(n) exempts a contract for services currently provided by council employees where it is below $150,000 (or another amount prescribed by the regulations). See the lgAct s 55 source. The Act does not state a GST treatment for that limb; the engine compares the GST-inclusive value, which is the conservative reading (the exemption is lost sooner).',
      url: 'https://legislation.nsw.gov.au/view/html/inforce/current/sl-2021-0460',
      asAt: '2026-08-04'
    },
    olg: {
      title: 'Procurement Guidelines for NSW Local Government (Office of Local Government)',
      url: 'https://www.olg.nsw.gov.au/sites/default/files/2026-07/procurement-guidelines-for-nsw-local-government.pdf',
      asAt: '2026-08-02'
    },
    lgp: {
      title: 'Local Government Procurement (LGP), approved contracts and legislation guidance',
      note: 'LGP arrangements are commonly relied on by councils as a tender-exempt purchasing route under s 55(3). Confirm the exemption limb your council relies on.',
      url: 'https://lgp.org.au/legislation/',
      asAt: '2026-08-02'
    },
    socAct: {
      title: 'State Owned Corporations Act 1989 (NSW)',
      note: 'SOCs are excluded from "government agency" under the Public Works and Procurement Act 1912 unless prescribed by regulation, so Procurement Board Directions do not automatically bind them.',
      url: 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1989-134',
      asAt: '2026-08-02'
    },
    gsf: {
      title: 'Government Sector Finance Act 2018 (NSW)',
      note: 'Governs delegations, spending authority and the duty to promote the efficient, effective and economical use of resources.',
      url: 'https://legislation.nsw.gov.au/view/html/inforce/current/act-2018-055',
      asAt: '2026-08-02'
    }
  };

  /* ---------------------------------------------------------------------------
   * Thresholds (AUD). Values are ex-GST unless the key says otherwise.
   * ------------------------------------------------------------------------ */
  var T = {
    /* Agency value bands — the unaccredited baseline. Accredited agencies follow
       their own agency rules, which are frequently tighter. */
    agencyAnySupplier: 10000,        // < : any supplier at reasonable market rates
    agencySingleQuote: 30000,        // 10k-30k : at least one written quotation
    agencyThreeQuotes: 680000,       // 30k-680k : at least three written quotations,
                                     //            or a process approved by the agency
                                     //            head / an accredited agency in cluster
    wogExemptBelow: 10000,           // may go outside a WoG arrangement below this

    /* Set-aside direct engagement ceilings — these are NOT the same figure. */
    smeDirect: 250000,               // SME direct engagement ceiling
    regionalDirect: 150000,          // regional business direct engagement ceiling
    aboriginalDirect: 250000,        // Aboriginal business direct engagement ceiling

    smeParticipation: 3000000,       // SME & Local Participation Plan + 10% eval weighting
    appParticipation: 7500000,       // 1.5% Aboriginal participation requirement at/above
    appParticipationPct: 1.5,

    eppGoodsServices: 680000,        // covered procurement, goods & other services (ex GST)
    eppConstruction: 9584000,        // covered procurement, construction (out of MVP scope)

    gipaDisclosureInclGst: 150000,   // register of government contracts (INCL GST)
    gipaClass3InclGst: 5000000,      // class 2 contract at/above this becomes class 3
    modernSlaveryReportInclGst: 150000, // heightened due diligence contract reporting

    iafIctProject: 5000000,          // ICT Assurance Framework
    level1RiskMcv: 20000000,         // level 1 must set a risk-based MCV above this
    ictaHighValue: 1000000,          // MICTA/ICTA framework: high-risk or high-value ICT

    councilTenderInclGst: 250000,    // LG Act s 55(3)(n)(i), INCLUSIVE of GST
    councilTenderStaffServices: 150000, // LG Act s 55(3)(n) staff-services limb, confirmed in the Act

    fpSmallBizInvoiceCap: 1000000,   // Faster Payment Terms: 5-business-day terms apply to invoices up to this
    sbShorterPayments: 7500000       // Shorter Payment Terms: 20-day subcontractor terms at/above this
  };

  /* GST factor used where a threshold is expressed inclusive of GST but the
     user enters an ex-GST value. */
  var GST = 1.1;

  /* ---------------------------------------------------------------------------
   * Prequalification schemes and standing arrangements.
   * ------------------------------------------------------------------------ */
  var SCHEMES = {
    scm0020: {
      code: 'SCM0020', name: 'Prequalification Scheme: ICT Services',
      covers: 'ICT and digital goods and services. Mandated for agency ICT procurement.',
      url: 'https://buy.nsw.gov.au/scheme/6B1F91AE-B3CC-0F0E-17267D5EF7BCEB9E'
    },
    scm0005: {
      code: 'SCM0005', name: 'Prequalification Scheme: Performance and Management Services',
      covers: 'Professional services including consultancy. Engagement types cover government and business strategy, business processes, project management, change management, financial services, audit, quality assurance and risk, and specialised services. Over 3,500 prequalified suppliers.',
      url: 'https://buy.nsw.gov.au/scheme/5686462E-F515-F34D-DF4D7C89274AD889'
    },
    scm0007: {
      code: 'SCM0007', name: 'Prequalification Scheme: Contingent Workforce',
      covers: 'Contingent labour supplied through recruitment organisations.',
      url: 'https://buy.nsw.gov.au/scheme/65CDBCCA-EA61-2354-9ECAFC84AE5A95B8'
    },
    scm0012: {
      code: 'SCM0012', name: 'Talent Acquisition Scheme (TAS)',
      covers: 'Permanent recruitment and talent acquisition services.',
      url: 'https://www.info.buy.nsw.gov.au/schemes'
    },
    scm2701: {
      code: 'SCM2701', name: 'Advertising and Digital Communications Services',
      covers: 'Advertising, media and digital communications services.',
      url: 'https://www.info.buy.nsw.gov.au/schemes'
    },
    pspa: {
      code: 'PSPA', name: 'ICT Professional Services Purchasing Arrangements',
      covers: 'ICT professional services engagements.',
      url: 'https://www.info.buy.nsw.gov.au/contracts/pspa'
    },
    eud: {
      code: 'EUD', name: 'ICT End User Devices and Services Contract',
      covers: 'End user computing devices and associated services.',
      url: 'https://www.info.buy.nsw.gov.au/contracts/ict-end-user-devices-and-services'
    },
    tpa: {
      code: 'TPA', name: 'Telecommunications Purchasing Arrangements',
      covers: 'Telecommunications carriage and related services.',
      url: 'https://www.info.buy.nsw.gov.au/contracts/telecommunications-purchasing-arrangements'
    }
  };

  /* ---------------------------------------------------------------------------
   * ICT categories, mapped to the ICTA modules that carry them.
   *
   * The point of this mapping: once you know MICTA/ICTA is the contracting
   * framework, you still have to attach the right module(s). Getting the module
   * wrong is a drafting error that surfaces late.
   * ------------------------------------------------------------------------ */
  var ICT_CATEGORIES = {
    'hardware': {
      label: 'Hardware and infrastructure',
      help: 'Servers (virtual or dedicated), storage, network, appliances, ancillary equipment and peripherals, and the hosting of that equipment.',
      maps: 'ict-goods',
      modules: ['Hardware and Other ICT Deliverables Module'],
      moduleWhy: 'Hardware and its support services sit in the Hardware and Other ICT Deliverables Module.',
      schemes: ['scm0020']
    },
    'end-user-devices': {
      label: 'End user devices',
      help: 'Laptops, desktops, mobile devices and the services around them.',
      maps: 'ict-goods',
      modules: ['Hardware and Other ICT Deliverables Module'],
      moduleWhy: 'Devices are ICT deliverables, so the Hardware and Other ICT Deliverables Module applies.',
      schemes: ['eud', 'scm0020']
    },
    'software-licensed': {
      label: 'Licensed software (non-cloud)',
      help: 'On-premises or self-hosted software licensed to you, perpetual or term.',
      maps: 'ict-goods',
      modules: ['Software (Non-Cloud) Module'],
      moduleWhy: 'Licensed, non-cloud software is contracted under the Software (Non-Cloud) Module.',
      schemes: ['scm0020']
    },
    'cloud': {
      label: 'Cloud and as-a-service',
      help: 'SaaS, PaaS, IaaS and hosted platforms.',
      maps: 'ict-services',
      modules: ['Cloud Module'],
      moduleWhy: 'Anything consumed as a service rather than licensed and installed belongs in the Cloud Module.',
      schemes: ['scm0020']
    },
    'development': {
      label: 'Software development and systems integration',
      help: 'Building, customising or integrating software.',
      maps: 'ict-services',
      modules: ['Services (Non-Cloud) Module'],
      moduleWhy: 'Software development services use the Services (Non-Cloud) Module, which carries the specific provisions dealing with development of software, including the IP position you need to settle early.',
      schemes: ['scm0020']
    },
    'support-managed': {
      label: 'Support and managed services',
      help: 'Ongoing support, monitoring and management of ICT environments.',
      maps: 'ict-services',
      modules: ['Services (Non-Cloud) Module', 'Hardware and Other ICT Deliverables Module'],
      moduleWhy: 'Which module depends on what is being supported: if the only services are hardware support, use the Hardware and Other ICT Deliverables Module. If you are procuring software support for software other than Licensed Software, use the Services (Non-Cloud) Module. Pick one deliberately rather than attaching both.',
      schemes: ['scm0020']
    },
    'ict-professional-services': {
      label: 'ICT professional services and consultancy',
      help: 'Advisory, architecture, strategy, programme and project services for ICT.',
      maps: 'professional-services',
      modules: ['Services (Non-Cloud) Module'],
      moduleWhy: 'Where these are contracted under ICTA, professional services are services rather than deliverables, so the Services (Non-Cloud) Module applies.',
      schemes: ['pspa', 'scm0020', 'scm0005'],
      note: 'ICT consultancy is treated separately from other ICT under the current ICT direction, and must also comply with the professional services direction regardless of accreditation level or engagement value.'
    },
    'telecommunications': {
      label: 'Telecommunications',
      help: 'Carriage services, mobile fleet, network connectivity.',
      maps: 'ict-services',
      modules: ['Hardware and Other ICT Deliverables Module'],
      moduleWhy: 'Telecommunications equipment sits with hardware and appliances; the carriage services themselves are usually bought under the Telecommunications Purchasing Arrangements rather than a bespoke ICTA.',
      schemes: ['tpa', 'scm0020']
    }
  };

  /* ---------------------------------------------------------------------------
   * Business (non-ICT) categories, mapped to the schemes that cover them.
   * ------------------------------------------------------------------------ */
  var BIZ_CATEGORIES = {
    'professional': {
      label: 'Professional, management or consulting services',
      help: 'Strategy, business process, project and change management, financial services, audit, quality assurance and risk, specialised advisory.',
      maps: 'professional-services', schemes: ['scm0005']
    },
    'contingent-workforce': {
      label: 'Contingent workforce and labour hire',
      help: 'Temporary staff engaged through a recruitment organisation.',
      maps: 'general-services', schemes: ['scm0007']
    },
    'recruitment': {
      label: 'Permanent recruitment',
      help: 'Talent acquisition for ongoing roles.',
      maps: 'general-services', schemes: ['scm0012']
    },
    'advertising': {
      label: 'Advertising, media and digital communications',
      maps: 'general-services', schemes: ['scm2701']
    },
    'legal': {
      label: 'Legal services',
      maps: 'professional-services', schemes: [],
      note: 'Legal services are usually engaged through arrangements administered outside the general schemes. Confirm the current NSW legal services arrangement before approaching the market, this tool does not have it encoded.'
    },
    'facilities': {
      label: 'Facilities, maintenance and property services',
      maps: 'general-services', schemes: []
    },
    'training': {
      label: 'Training and education services',
      maps: 'general-services', schemes: []
    },
    'goods': {
      label: 'Goods, equipment and supplies',
      maps: 'general-goods', schemes: []
    },
    'other': {
      label: 'Something else / not sure',
      maps: 'general-services', schemes: []
    }
  };

  /* ---------------------------------------------------------------------------
   * Buyer types.
   * ------------------------------------------------------------------------ */
  var BUYER_TYPES = {
    'nsw-agency': {
      label: 'NSW Government agency',
      blurb: 'Department, executive agency, separate agency, statutory authority or advisory entity.',
      framework: 'ppf',
      boundByPbd: true
    },
    'nsw-health': {
      label: 'NSW Health entity',
      blurb: 'Ministry of Health, local health district, specialty network or health support organisation.',
      framework: 'ppf',
      boundByPbd: true
    },
    'nsw-council': {
      label: 'NSW local council',
      blurb: 'Council or county council under the Local Government Act 1993.',
      framework: 'lga',
      boundByPbd: false
    },
    'nsw-soc': {
      label: 'NSW State owned corporation',
      blurb: 'SOC under the State Owned Corporations Act 1989.',
      framework: 'own',
      boundByPbd: false
    },
    'nsw-uni': {
      label: 'NSW university',
      blurb: 'University established by its own NSW Act.',
      framework: 'own',
      boundByPbd: false
    }
  };

  /* ---------------------------------------------------------------------------
   * Question set. `showIf` receives the current answers object.
   * ------------------------------------------------------------------------ */
  var isPbdBuyer = function (a) {
    return a.buyerType === 'nsw-agency' || a.buyerType === 'nsw-health';
  };
  var isIct = function (a) {
    return a.procurementType === 'ict' || a.category === 'ict-services' || a.category === 'ict-goods';
  };

  var QUESTIONS = [
    {
      id: 'buyerType', type: 'select', required: true,
      label: 'Who is the buyer?',
      help: 'This decides which rulebook applies. It is the single biggest driver of the answer.',
      options: Object.keys(BUYER_TYPES).map(function (k) {
        return { value: k, label: BUYER_TYPES[k].label, help: BUYER_TYPES[k].blurb };
      })
    },
    {
      id: 'accreditation', type: 'select', showIf: isPbdBuyer,
      label: 'What is the agency\'s goods and services accreditation level?',
      help: 'This sets the maximum contract value (MCV) the agency can procure on its own authority before it needs concurrence. The two levels are not interchangeable.',
      options: [
        { value: 'level-2', label: 'Accredited, Level 2', help: 'No prescribed MCV. Procures to its own budget and delegations, and plays a concurrence role for others in its portfolio.' },
        { value: 'level-1', label: 'Accredited, Level 1', help: 'Staggered risk- and spend-based MCV; concurrence required above it. Over $20 million a risk-based MCV must be set using the decision tree.' },
        { value: 'not-accredited', label: 'Not accredited', help: 'Low-value contracts only on its own authority; needs assurance from an accredited agency or NSW Procurement above that.' },
        { value: 'unknown', label: "Don't know" }
      ]
    },
    {
      id: 'eppCovered', type: 'select', showIf: isPbdBuyer,
      label: 'Is the agency listed in Schedule 2 of PBD-2019-05 (enforceable procurement provisions)?',
      help: 'Check Schedule 2 of the current PBD-2019-05, the list shifts with machinery-of-government changes. If covered, international agreement obligations bite at $680,000 and above. If you do not know, the tool applies the covered rules as the safe course.',
      options: [
        { value: 'yes', label: 'Yes, covered' },
        { value: 'no', label: 'No, not covered' },
        { value: 'unknown', label: "Don't know" }
      ]
    },
    {
      id: 'procurementType', type: 'select', required: true,
      label: 'Is this ICT, or business goods and services?',
      help: 'ICT has its own mandatory scheme and its own contracting framework, so this split decides which rulebook you are in.',
      options: [
        { value: 'ict', label: 'ICT and digital', help: 'Anything technology, hardware, software, cloud, development, support, ICT advisory.' },
        { value: 'business', label: 'Business goods and services', help: 'Everything else, professional services, workforce, facilities, goods.' }
      ]
    },
    {
      id: 'ictCategory', type: 'select', required: true,
      showIf: function (a) { return a.procurementType === 'ict'; },
      label: 'Which ICT category?',
      help: 'This determines which ICTA module you attach if you are contracting under the MICTA/ICTA framework.',
      options: Object.keys(ICT_CATEGORIES).map(function (k) {
        return { value: k, label: ICT_CATEGORIES[k].label, help: ICT_CATEGORIES[k].help };
      })
    },
    {
      id: 'bizCategory', type: 'select', required: true,
      showIf: function (a) { return a.procurementType === 'business'; },
      label: 'Which category?',
      help: 'Used to work out which prequalification scheme, if any, covers this.',
      options: Object.keys(BIZ_CATEGORIES).map(function (k) {
        return { value: k, label: BIZ_CATEGORIES[k].label, help: BIZ_CATEGORIES[k].help };
      })
    },
    {
      id: 'schemeKnown', type: 'select', required: true,
      label: 'Do you already know which prequalification scheme or panel applies?',
      help: 'If you do, name it and the tool will work from that. If not, it will infer the likely scheme from the category you picked.',
      options: [
        { value: 'no', label: 'No, work it out for me' },
        { value: 'yes', label: 'Yes, I know which one' },
        { value: 'none', label: 'I am confident none applies' }
      ]
    },
    {
      id: 'schemeSelected', type: 'select',
      showIf: function (a) { return a.schemeKnown === 'yes'; },
      label: 'Which scheme or arrangement?',
      options: Object.keys(SCHEMES).map(function (k) {
        return { value: k, label: SCHEMES[k].code + ', ' + SCHEMES[k].name, help: SCHEMES[k].covers };
      }).concat([{ value: 'other', label: 'Another scheme or panel not listed here' }])
    },
    {
      id: 'value', type: 'number', required: true, prefix: '$',
      label: 'Estimated whole-of-contract value (AUD, ex GST)',
      help: 'Include every extension option, all likely variations, and the full term. Do not value only the initial period, under-valuing to duck a threshold is contract splitting.',
      min: 0, step: 10000
    },
    {
      id: 'valueIncludesOptions', type: 'bool', required: true,
      label: 'Does that figure include all extension options and expected variations?',
      help: 'If no, the tool will flag aggregation risk.'
    },
    {
      id: 'relatedSpend', type: 'select',
      label: 'Have you bought similar goods/services from this market in the last 12 months?',
      help: 'Repeat or split purchases are aggregated for threshold purposes.',
      options: [
        { value: 'no', label: 'No, this is a discrete requirement' },
        { value: 'yes-under', label: 'Yes, combined value still under the next threshold' },
        { value: 'yes-over', label: 'Yes, combined value would cross a threshold' },
        { value: 'unknown', label: "Don't know" }
      ]
    },
    {
      id: 'arrangement', type: 'select', required: true,
      label: 'Is this available under an existing panel, scheme or whole-of-government arrangement?',
      options: [
        { value: 'wog', label: 'Yes, a mandatory whole-of-government contract covers it' },
        { value: 'scheme', label: 'Yes, a prequalification scheme or panel covers it' },
        { value: 'lgp', label: 'Yes, an LGP / Procurement Australia / approved council arrangement covers it' },
        { value: 'no', label: 'No existing arrangement covers it' },
        { value: 'unknown', label: "Don't know" }
      ]
    },
    {
      id: 'incumbent', type: 'select', required: true,
      label: 'Is there a current supplier for this requirement?',
      options: [
        { value: 'none', label: 'No incumbent, new requirement' },
        { value: 'options-remaining', label: 'Yes, the contract still has unexercised extension options' },
        { value: 'no-options', label: 'Yes, but all options are exhausted or none exist' },
        { value: 'expired', label: 'Yes, the contract has expired or is being rolled over informally' }
      ]
    },
    {
      id: 'wantDirect', type: 'bool', required: true,
      label: 'Do you want to negotiate directly with a single supplier?',
      help: 'The tool will tell you whether that is permissible, and on what grounds.'
    },
    {
      id: 'soleGrounds', type: 'multi', showIf: function (a) { return a.wantDirect === true; },
      label: 'Which of these genuinely apply?',
      help: 'Be honest here, these are the grounds a delegate has to be satisfied of. Tick nothing if none apply.',
      options: [
        { value: 'unique-technical', label: 'Only one supplier can do it for technical reasons, with no reasonable alternative or substitute' },
        { value: 'ip', label: 'Exclusive IP, licence or statutory right held by one supplier' },
        { value: 'compatibility', label: 'Additional supply where changing supplier would duplicate cost or cause significant technical incompatibility' },
        { value: 'urgency', label: 'Extreme urgency from genuinely unforeseen events, an open approach cannot deliver in time' },
        { value: 'no-responses', label: 'An open approach was already run and produced no suitable responses' },
        { value: 'emergency', label: 'Declared emergency / natural disaster response' }
      ]
    },
    {
      id: 'supplierAttrs', type: 'multi',
      label: 'Does the intended or likely supplier have any of these characteristics?',
      help: 'These unlock set-aside and direct engagement pathways.',
      options: [
        { value: 'aboriginal', label: 'Aboriginal business', help: 'Verify registration, e.g. NSW Indigenous Chamber of Commerce or Supply Nation.' },
        { value: 'sme', label: 'SME', help: 'Australian or NZ based, fewer than 200 FTE employees.' },
        { value: 'regional', label: 'Regional NSW business' },
        { value: 'ade', label: 'Australian Disability Enterprise' },
        { value: 'social', label: 'Social enterprise / certified B Corp' }
      ]
    },
    {
      id: 'specClarity', type: 'select', required: true,
      label: 'How well defined is what you are buying?',
      help: 'This is the main driver of whether you run an RFQ, an RFT or an RFP.',
      options: [
        { value: 'defined', label: 'Fully specified', help: 'You can describe exactly what you want and suppliers only need to price it.' },
        { value: 'outcome-known', label: 'Outcome known, solution is not', help: 'You know what you need to achieve, but not how it should be delivered, you want suppliers to propose an approach.' },
        { value: 'exploring', label: 'Still working out what is possible', help: 'You cannot yet write a requirement without talking to the market first.' }
      ]
    },
    {
      id: 'marketKnowledge', type: 'select', required: true,
      label: 'How well do you know the supply market?',
      help: 'Drives whether a shortlisting stage earns its cost.',
      options: [
        { value: 'known-few', label: 'Known, and few capable suppliers' },
        { value: 'known-many', label: 'Known, and many capable suppliers' },
        { value: 'unknown', label: 'Not well understood, unsure who can deliver this' }
      ]
    },
    {
      id: 'bidCost', type: 'select',
      label: 'How costly is it for a supplier to bid?',
      help: 'High bid cost is the usual justification for shortlisting before a full response.',
      options: [
        { value: 'low', label: 'Low, a price and a short capability statement' },
        { value: 'high', label: 'High, design work, modelling, prototypes or a detailed solution' }
      ]
    },
    {
      id: 'evalPriceWeight', type: 'number', suffix: '% price', required: true,
      label: 'What weighting will price carry in the evaluation?',
      help: 'Enter price as a percentage of the total score. Non-price is the remainder. The mandated SME and government-objectives allocations are shares of the NON-PRICE component, so this figure changes what they are worth overall.',
      min: 0, max: 100, step: 5
    },
    {
      id: 'approachOverride', type: 'select',
      label: 'Override the recommended approach?',
      help: 'Leave as "use the recommendation" unless you have already committed to a method and want it checked instead.',
      options: [
        { value: '', label: 'Use the recommendation' },
        { value: 'single-rfq', label: 'Single stage, RFQ' },
        { value: 'single-rfp', label: 'Single stage, RFP' },
        { value: 'single-rft', label: 'Single stage, RFT' },
        { value: 'multi-rfq', label: 'Multi stage, EOI then RFQ' },
        { value: 'multi-rfp', label: 'Multi stage, EOI then RFP' },
        { value: 'multi-rft', label: 'Multi stage, EOI then selective RFT' },
        { value: 'limited', label: 'Limited tender / direct negotiation' }
      ]
    },
    {
      /* PPF buyers only: the cyber/offshore/PPIP rules these feed are encoded
         for agencies under the Board's framework. Asking a council or SOC and
         then ignoring the answer costs more trust than the question is worth. */
      id: 'dataSensitivity', type: 'select',
      showIf: function (a) { return isIct(a) && isPbdBuyer(a); },
      label: 'What is the highest classification of NSW Government data the supplier will handle?',
      options: [
        { value: 'none', label: 'None, no government data involved' },
        { value: 'official', label: 'OFFICIAL' },
        { value: 'sensitive', label: 'OFFICIAL: Sensitive' },
        { value: 'personal', label: 'Personal or health information' },
        { value: 'protected', label: 'PROTECTED or above' }
      ]
    },
    {
      id: 'offshore', type: 'bool',
      showIf: function (a) { return isIct(a) && isPbdBuyer(a); },
      label: 'Will any government data be stored or accessed offshore?'
    },
    {
      id: 'ictProject', type: 'bool', showIf: isIct,
      label: 'Is this part of a State-funded ICT project (capital or recurrent) of $5 million or more?'
    },
    {
      id: 'councilStaffServices', type: 'bool',
      showIf: function (a) { return a.buyerType === 'nsw-council'; },
      label: 'Is this a contract for services currently provided by council employees?',
      help: 'A lower tender threshold applies to these contracts.'
    },
    {
      id: 'councilResolution', type: 'bool',
      showIf: function (a) { return a.buyerType === 'nsw-council'; },
      label: 'Has the council resolved (or would it resolve) that tendering would not achieve a satisfactory result?',
      help: 'Extenuating circumstances, remoteness of locality, or unavailability of competitive or reliable tenderers, a formal council resolution is required.'
    }
  ];

  var STEPS = [
    { id: 'buyer', title: 'Buyer', questions: ['buyerType', 'accreditation', 'eppCovered'] },
    { id: 'what', title: 'Requirement', questions: ['procurementType', 'ictCategory', 'bizCategory', 'schemeKnown', 'schemeSelected', 'value', 'valueIncludesOptions', 'relatedSpend'] },
    { id: 'market', title: 'Market', questions: ['arrangement', 'incumbent', 'wantDirect', 'soleGrounds'] },
    { id: 'approach', title: 'Approach', questions: ['specClarity', 'marketKnowledge', 'bidCost', 'evalPriceWeight', 'approachOverride'] },
    { id: 'policy', title: 'Policy', questions: ['supplierAttrs', 'councilStaffServices', 'councilResolution'] },
    { id: 'ict', title: 'ICT', questions: ['dataSensitivity', 'offshore', 'ictProject'] }
  ];

  PACK = {
    id: 'nsw',
    label: 'New South Wales',
    version: '0.3.0',
    asAt: '2026-08-04',
    scope: 'Goods, services and ICT. Construction and infrastructure procurement is out of scope for this version.',
    sources: SOURCES,
    thresholds: T,
    gst: GST,
    buyerTypes: BUYER_TYPES,
    schemes: SCHEMES,
    ictCategories: ICT_CATEGORIES,
    bizCategories: BIZ_CATEGORIES,
    questions: QUESTIONS,
    steps: STEPS
  };
})();

export default PACK;
