import PageLayout from '../../components/layout/PageLayout.jsx';
import LegalPage from '../../features/system/components/LegalPage.jsx';

// Placeholder copy — final wording is owned by the client and managed in the
// CMS Pages editor (Stage-1 gap analysis SF-09).
const SECTIONS = [
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
];

export default function TermsPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <LegalPage
          title="Terms of Use"
          updated="September 2025"
          intro="The terms governing your use of this website."
          sections={SECTIONS}
        />
      </PageLayout>
    </div>
  );
}
