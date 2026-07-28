import kheirPhoto from '../../assets/images/ExpertiseImage.png';

// Placeholder roster for the Our Team pages. Static for now, in the same spirit
// as features/forum/data.js — swap this for a CMS-backed list once the page
// design is signed off.
//
// `photo` is optional: set it and the headshot is used, leave it null and the
// card falls back to the person's initials — so the layout holds without stock
// photos standing in for real people until the real headshots arrive.
export const TEAM = [
  // Name, role, photo, About copy and Expertise list all come from the Our
  // Expertise page (ExpertiseHero + AboutExpertise), so the two stay in step.
  {
    slug: 'mohammed-kheir',
    // Only members with real profile copy link through to a detail page; the
    // placeholder people below stay as static cards until theirs is written.
    hasProfile: true,
    name: 'Mohammed Kheir',
    role: 'Founder',
    location: 'Government Procurement',
    email: 'mkheir@govprocurement.com.au',
    linkedin: 'https://www.linkedin.com/company/governmentprocurement/',
    photo: kheirPhoto,
    summary:
      'We help public sector teams and suppliers get government procurement right, from shaping a sourcing strategy to running fair, defensible tenders that stand up to scrutiny.',
    about: [
      'We help public sector teams and suppliers get government procurement right, from shaping a sourcing strategy to running fair, defensible tenders that stand up to scrutiny.',
      'Our advisors have sat on both sides of the table, evaluating bids and writing them. That experience shapes practical guidance you can act on, not theory.',
      'Whether you are building capability across a procurement function or preparing a single high-stakes tender, we tailor our support to where you are and what you need to achieve.',
      'The result is stronger competition, better value for money, and outcomes that are transparent and easy to justify to stakeholders and auditors alike.',
    ],
    expertise: [
      'Strategy Development',
      'Tender Design & Documentation',
      'Evaluation & Assessment',
      'Capacity Building & Training',
    ],
  },
  {
    slug: 'daniel-okafor',
    name: 'Daniel Okafor',
    role: 'Director, Bid Advisory',
    location: 'Melbourne',
    email: 'daniel.okafor@govprocurement.com.au',
    linkedin: 'https://www.linkedin.com/company/governmentprocurement/',
    photo: null,
    summary:
      'Helps suppliers build bids that answer the question actually being asked, and coaches teams through competitive tender processes.',
    about: [
      'Daniel works on the supplier side of the table, helping organisations understand how their bids are read and scored. He has supported submissions across defence, health and transport portfolios.',
      'He runs our bid clinics and much of the practical training, translating evaluation criteria into the plain language a writing team can act on.',
    ],
    expertise: [
      'Bid strategy',
      'Tender response writing',
      'Pricing and value for money',
      'Capability statements',
    ],
  },
  {
    slug: 'priya-raman',
    name: 'Priya Raman',
    role: 'Head of Training',
    location: 'Brisbane',
    email: 'priya.raman@govprocurement.com.au',
    linkedin: 'https://www.linkedin.com/company/governmentprocurement/',
    photo: null,
    summary:
      'Designs and delivers the training programme, from procurement fundamentals through to advanced contract management.',
    about: [
      'Priya owns our course catalogue end to end — curriculum, delivery and the assessment that sits behind the certificates. She has trained procurement officers across every Australian jurisdiction.',
      'Her focus is on courses people can use the following Monday: less theory, more worked examples drawn from real approaches to market.',
    ],
    expertise: [
      'Curriculum design',
      'Contract management',
      'Facilitation',
      'Capability uplift',
    ],
  },
  {
    slug: 'james-whitfield',
    name: 'James Whitfield',
    role: 'Senior Advisor, Contracts',
    location: 'Canberra',
    email: 'james.whitfield@govprocurement.com.au',
    linkedin: 'https://www.linkedin.com/company/governmentprocurement/',
    photo: null,
    summary:
      'Specialises in contract negotiation and management, with a focus on getting the commercial terms right before signature.',
    about: [
      'James advises on the commercial mechanics of government contracts — drafting, negotiation, variations and the disputes that follow when the first three are rushed.',
      'He works closely with legal teams but keeps the commercial view front and centre, so agencies understand what they are agreeing to operationally, not just legally.',
    ],
    expertise: [
      'Contract negotiation',
      'Commercial terms',
      'Supplier performance',
      'Variations and disputes',
    ],
  },
  {
    slug: 'sofia-almeida',
    name: 'Sofia Almeida',
    role: 'Advisor, Social Procurement',
    location: 'Adelaide',
    email: 'sofia.almeida@govprocurement.com.au',
    linkedin: 'https://www.linkedin.com/company/governmentprocurement/',
    photo: null,
    summary:
      'Works on social and sustainable procurement policy, and how to turn those commitments into evaluable tender requirements.',
    about: [
      'Sofia helps agencies move social procurement from policy statement to something a panel can actually assess, and helps suppliers evidence what they already do.',
      'She has worked on Indigenous participation, local content and modern slavery requirements across a range of agency programmes.',
    ],
    expertise: [
      'Social procurement',
      'Sustainability requirements',
      'Indigenous participation',
      'Modern slavery compliance',
    ],
  },
  {
    slug: 'tom-berensen',
    name: 'Tom Berensen',
    role: 'Advisor, Digital and ICT',
    location: 'Perth',
    email: 'tom.berensen@govprocurement.com.au',
    linkedin: 'https://www.linkedin.com/company/governmentprocurement/',
    photo: null,
    summary:
      'Focuses on ICT and digital sourcing, where the requirement is often still moving when the approach to market opens.',
    about: [
      'Tom advises on digital and ICT procurements — panel arrangements, SaaS agreements, and staged approaches where the requirement is genuinely uncertain at the outset.',
      'He spends much of his time on the question agencies find hardest here: how to buy something iteratively without losing competitive tension or auditability.',
    ],
    expertise: [
      'ICT sourcing',
      'SaaS and cloud agreements',
      'Panel arrangements',
      'Agile procurement',
    ],
  },
];

export function getMember(slug) {
  return TEAM.find((member) => member.slug === slug) || null;
}
