import PageLayout from '../../components/layout/PageLayout.jsx';
import LegalPage from '../../features/system/components/LegalPage.jsx';

// Placeholder copy — final wording is owned by the client and managed in the
// CMS Pages editor, the same way Privacy and Terms are.
const SECTIONS = [
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
];

export default function ConflictsOfInterestPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <LegalPage
          title="Conflicts of Interest"
          intro="How we identify, declare, and manage conflicts of interest across our engagements."
          sections={SECTIONS}
        />
      </PageLayout>
    </div>
  );
}
