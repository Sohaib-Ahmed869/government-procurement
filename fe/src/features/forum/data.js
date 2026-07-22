// Forum content keyed by audience category. "win" = supplier-side questions,
// "award" = agency/buyer-side questions.
export const CATEGORY_LABEL = {
  win: 'Win Contracts',
  award: 'Award Contracts',
};

export const CATEGORIES = [
  { key: 'award', label: 'Award Contracts' },
  { key: 'win', label: 'Win Contracts' },
];

// Each item drives both the answer card (title, date, body excerpt) and its
// article page (body = the Question, plus answer paragraphs and lesson points).
export const ANSWERS_BY_CATEGORY = {
  win: [
    {
      id: 'lowest-bid',
      title: 'Lowest Bid But Non-Compliant',
      date: 'September 3, 2025',
      body: 'What happens if a supplier submits the lowest bid, but the evaluation panel finds gaps in compliance? A local construction firm submits a bid for a government facilities upgrade project. Their price is 15% lower than competitors, but their submission omits key workplace safety documentation and provides no evidence of prior government project experience.',
      answer: [
        'In this situation, the evaluation framework prioritises both compliance and capability over price alone. While the bid may appear attractive initially, the missing safety documentation creates a probity risk — the agency could be liable if the supplier fails to meet legal obligations.',
        'The evaluation panel would likely mark the submission as non-compliant. The contract could not be awarded to this supplier, even if their price is the lowest. Instead, evaluators would turn to the next highest-scoring supplier — often one who balances cost with proven compliance, experience, and value-adds.',
      ],
      lesson: [
        'For suppliers: lowest cost does not guarantee success — compliance and capability are mandatory.',
        'For agencies: robust evaluation frameworks protect against risk and ensure defensible procurement outcomes.',
      ],
    },
    {
      id: 'missed-deadline',
      title: 'Missed Deadline',
      date: 'September 3, 2025',
      body: 'A supplier completes their tender response on time but experiences technical issues during upload, resulting in submission a few minutes past the closing deadline. Does the agency have discretion to accept it?',
      answer: [
        'Procurement rules generally treat the closing time as strict. A late submission — even by minutes — is usually deemed non-conforming, and accepting it risks challenge from other bidders who met the deadline.',
        "Some frameworks allow limited discretion where the delay was caused by the agency's own systems or a documented platform outage. The supplier would need clear evidence that the failure was outside their control, and the agency must apply any exception consistently and transparently.",
      ],
      lesson: [
        'For suppliers: submit well before the deadline and keep evidence of your upload attempts.',
        'For agencies: publish a clear late-submission policy and apply it consistently to protect probity.',
      ],
    },
    {
      id: 'sustainable-impact',
      title: 'Balancing Sustainable Impact',
      date: 'September 3, 2025',
      body: 'Two bids are equally competitive on cost and delivery, but one includes measurable commitments to sustainability, local jobs, and social impact. How do evaluators factor these non-price benefits into the final decision?',
      answer: [
        'Where price and delivery are comparable, non-price criteria become the deciding factor — provided they were disclosed in the evaluation methodology. Measurable, verifiable commitments carry far more weight than general statements of intent.',
        'Evaluators should score social and sustainability value against the published criteria and document how each commitment influenced the outcome, ensuring the decision is defensible and tied to the stated objectives.',
      ],
      lesson: [
        'For suppliers: make sustainability and social commitments specific and measurable.',
        'For agencies: weight non-price value only where it is disclosed and can be verified.',
      ],
    },
  ],
  award: [
    {
      id: 'non-price-value',
      title: 'Evaluating Non-Price Value',
      date: 'September 3, 2025',
      body: 'How should an agency weigh non-price factors without exposing the evaluation to challenge? A department is assessing tenders where the lowest-priced bid scores poorly on capability and social value, and panel members disagree on how much weight to give the qualitative criteria.',
      answer: [
        'The weighting between price and non-price criteria must be set and disclosed before tenders are received. Changing the emphasis during evaluation — or applying undisclosed criteria — is the most common ground for a successful challenge.',
        'Panels should score each criterion independently against the published methodology, record the reasons for each score, and reconcile disagreement through consensus notes rather than averaging away genuine differences.',
      ],
      lesson: [
        'For agencies: fix and publish criteria weightings before the tender opens.',
        'For panels: document the reasoning behind every score to keep the decision defensible.',
      ],
    },
    {
      id: 'probity-concern',
      title: 'Managing a Probity Concern',
      date: 'September 3, 2025',
      body: 'During evaluation, a panel member discovers a past working relationship with one of the bidders. What steps must the agency take to protect the integrity of the procurement and avoid any perception of bias in the award decision?',
      answer: [
        'The conflict must be declared immediately and recorded in the probity register. Depending on its nature, the panel member may need to be recused from scoring that bidder — or from the evaluation entirely.',
        'The agency should assess whether any scoring already completed is affected, and consider appointing an independent probity advisor to review the process before proceeding to award.',
      ],
      lesson: [
        'For agencies: require conflict declarations up front and maintain a probity register.',
        'For panels: manage perceived conflicts as seriously as actual ones.',
      ],
    },
    {
      id: 'above-lowest-price',
      title: 'Awarding Above the Lowest Price',
      date: 'September 3, 2025',
      body: 'An agency wants to award to a supplier who is not the cheapest but offers stronger delivery assurance and local economic benefits. How can evaluators document a defensible value-for-money decision that withstands scrutiny?',
      answer: [
        'Value for money is not the same as lowest price. Where a higher-priced bid is selected, the evaluation must show — against the published criteria — why the additional cost delivers proportionate additional value.',
        'The award recommendation should quantify the benefits where possible, reference the scored evaluation, and explain how risk, capability, and whole-of-life cost informed the decision.',
      ],
      lesson: [
        'For agencies: tie any price premium to specific, evidenced benefits.',
        'For evaluators: base the recommendation on scored criteria, not narrative alone.',
      ],
    },
  ],
};

// Flat list with the category key attached, plus a lookup for the article page.
export const ALL_ANSWERS = Object.entries(ANSWERS_BY_CATEGORY).flatMap(
  ([category, list]) => list.map((answer) => ({ ...answer, category }))
);

export function getAnswerById(id) {
  return ALL_ANSWERS.find((answer) => answer.id === id) ?? ALL_ANSWERS[0];
}
