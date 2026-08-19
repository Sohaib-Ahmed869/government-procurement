// B5 — the policy set, and the placeholder copy the pages fall back to.
//
// THE SET (B5.1). Adding a policy is one entry here plus a CMS page under the
// matching slug. Nothing else needs touching: the index lists whatever is in
// this array, and /policies/:slug resolves against it.
//
// `group` is what the index groups by. Three policies do not need grouping, but
// the set is expected to grow (an accessibility statement, a complaints policy,
// a modern slavery statement have all been raised), and grouping added later to
// a list people have learned is a worse change than grouping present from the
// start.
export const POLICIES = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    group: 'Your information',
    summary: 'What personal information we collect, how we use it, and the choices you have.',
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    group: 'Using this site',
    summary: 'The terms that govern your use of this website and anything you post to it.',
  },
  {
    slug: 'conflicts-of-interest',
    title: 'Conflicts of Interest',
    group: 'How we work',
    summary:
      'How we identify, declare and manage conflicts across advisory and probity engagements.',
  },
];

export const POLICY_BY_SLUG = Object.fromEntries(POLICIES.map((p) => [p.slug, p]));

// Below the index page shows a search box. Under this many policies it does not:
// a filter over three items is a control that costs more attention than it saves.
export const SEARCH_THRESHOLD = 5;

// PLACEHOLDER COPY (B5.5).
//
// This is NOT policy. It is scaffolding written to give the template something
// of realistic shape and length to be designed against, and it is what the page
// falls back to when the CMS holds nothing for a slug. Every page rendering
// from here carries a banner saying so, in the document itself and in print,
// because a policy page that looks finished and is not is the one failure mode
// that actually matters here.
//
// The moment a real page is published in the CMS under the matching slug, the
// CMS copy wins and the banner disappears. Nothing here needs deleting.
export const PLACEHOLDER_SECTIONS = {
  'privacy': [
  {
    heading: '1. About this policy',
    body: [
      'Government Procurement ("we", "us", "our") is committed to protecting your privacy and handling your personal information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).',
      'This policy explains what personal information we collect, how we use it, and the choices available to you.',
    ],
  },
  {
    heading: '2. Information we collect',
    body: [
      'We collect information you provide directly to us and information collected automatically when you use our website:',
      {
        list: [
          'Contact details you submit through forms (name, email, organisation, phone).',
          'Questions and content you post to the forum.',
          'Newsletter subscription preferences.',
          'Usage data such as pages visited, collected via analytics where you have consented.',
        ],
      },
    ],
  },
  {
    heading: '3. How we use your information',
    body: [
      'We use personal information to respond to enquiries, deliver courses and advisory services, send communications you have subscribed to, moderate forum content, and improve our website.',
    ],
  },
  {
    heading: '4. Cookies and analytics',
    body: [
      'We use cookies and similar technologies. Non-essential cookies (including analytics and marketing pixels) fire only after you consent via our cookie banner, in line with Consent Mode v2. You can change your preferences at any time.',
    ],
  },
  {
    heading: '5. Disclosure',
    body: [
      'We do not sell your personal information. We may share it with service providers who help us operate the website and deliver services, under confidentiality obligations.',
    ],
  },
  {
    heading: '6. Accessing and correcting your information',
    body: [
      'You may request access to, or correction of, the personal information we hold about you, and you may unsubscribe from marketing communications at any time using the link in our emails.',
    ],
  },
  {
    heading: '7. Contact us',
    body: [
      'For any privacy question or to make a complaint, please contact us through our Contact page. We will respond within a reasonable period.',
    ],
  },
],
  'terms': [
  {
    heading: '1. Acceptance of terms',
    body: [
      'By accessing and using the Government Procurement website, you agree to be bound by these Terms of Use. If you do not agree, please do not use the website.',
    ],
  },
  {
    heading: '2. Use of the website',
    body: [
      'You may use this website for lawful purposes only. You agree not to:',
      {
        list: [
          'Use the website in any way that breaches applicable laws or regulations.',
          'Post content to the forum that is unlawful, misleading, defamatory, or infringing.',
          'Attempt to gain unauthorised access to any part of the website or its systems.',
        ],
      },
    ],
  },
  {
    heading: '3. Forum content',
    body: [
      'Questions and answers submitted to the forum are moderated before publication. We reserve the right to edit, reject, or remove any content at our discretion.',
    ],
  },
  {
    heading: '4. Intellectual property',
    body: [
      'All content on this website, including text, graphics, logos, and course materials, is owned by or licensed to Government Procurement and is protected by copyright. You may not reproduce it without permission.',
    ],
  },
  {
    heading: '5. Disclaimer',
    body: [
      'The information on this website is provided for general guidance only and does not constitute professional or legal advice. We make no warranties as to its accuracy or completeness.',
    ],
  },
  {
    heading: '6. Limitation of liability',
    body: [
      'To the extent permitted by law, we are not liable for any loss or damage arising from your use of, or reliance on, this website.',
    ],
  },
  {
    heading: '7. Changes to these terms',
    body: [
      'We may update these Terms of Use from time to time. Continued use of the website after changes are posted constitutes acceptance of the revised terms.',
    ],
  },
],
  'conflicts-of-interest': [
  {
    heading: '1. Purpose',
    body: [
      'Government Procurement advises both buyers awarding contracts and suppliers bidding for them. This policy sets out how we identify, declare, and manage conflicts of interest so that every engagement is impartial and defensible.',
    ],
  },
  {
    heading: '2. What is a conflict of interest',
    body: [
      'A conflict of interest arises where a personal, financial, or professional interest could improperly influence, or be seen to influence, the advice we give or the decisions we support. Conflicts may be:',
      {
        list: [
          'Actual: a direct conflict between a current duty and a competing interest.',
          'Potential: an interest that could conflict with a duty in the foreseeable future.',
          'Perceived: an interest a reasonable observer could believe is influencing our advice, whether or not it is.',
        ],
      },
    ],
  },
  {
    heading: '3. Identification and declaration',
    body: [
      'Every team member declares relevant interests on engagement and updates that declaration whenever their circumstances change. Interests are recorded in our conflicts register and reviewed before an engagement is accepted.',
    ],
  },
  {
    heading: '4. Managing conflicts',
    body: [
      'Where a conflict is identified, we apply one or more of the following controls, proportionate to the risk:',
      {
        list: [
          'Disclosure to the affected client or clients before work begins.',
          'Restricting an individual from working on the engagement.',
          'Separating teams and information so that advice to one party is not informed by another.',
          'Declining or withdrawing from the engagement where no control is sufficient.',
        ],
      },
    ],
  },
  {
    heading: '5. Advising buyers and suppliers',
    body: [
      'We do not advise a buyer on the evaluation of a procurement while also advising a supplier bidding into that same procurement. Where our work for one party would give an unfair advantage to another, we decline the second engagement.',
    ],
  },
  {
    heading: '6. Confidentiality',
    body: [
      'Information obtained during an engagement is used only for that engagement. It is not disclosed to, or used for the benefit of, any other client, and is handled in line with our Privacy Policy.',
    ],
  },
  {
    heading: '7. Raising a concern',
    body: [
      'If you believe a conflict of interest has not been properly identified or managed, please contact us through our Contact page. Concerns are reviewed by a person independent of the engagement and answered within a reasonable period.',
    ],
  },
  {
    heading: '8. Changes to this policy',
    body: [
      'We may update this policy from time to time. The current version is always the one published on this page.',
    ],
  },
],
};

// The intro line under each title, used with the placeholder copy. Real pages
// carry their own.
export const PLACEHOLDER_INTRO = {
  privacy: 'How we collect, use, and protect your personal information.',
  terms: 'The terms governing your use of this website.',
  'conflicts-of-interest':
    'How we identify, declare, and manage conflicts of interest across our engagements.',
};
