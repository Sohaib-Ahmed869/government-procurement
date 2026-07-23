import PageLayout from '../../components/layout/PageLayout.jsx';
import LegalPage from '../../features/system/components/LegalPage.jsx';

// Placeholder copy — final wording is owned by the client and managed in the
// CMS Pages editor. Structured to the Privacy Act 1988 / Australian Privacy
// Principles per the Stage-1 gap analysis (SF-09).
const SECTIONS = [
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
];

export default function PrivacyPolicyPage() {
  return (
    <PageLayout>
      <LegalPage
        title="Privacy Policy"
        updated="September 2025"
        intro="How we collect, use, and protect your personal information."
        crumbs={[{ label: 'Privacy Policy' }]}
        sections={SECTIONS}
      />
    </PageLayout>
  );
}
