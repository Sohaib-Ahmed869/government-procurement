import PageLayout from '../../components/layout/PageLayout.jsx';
import TemplatesHero from '../../features/templates/components/TemplatesHero.jsx';
import TemplatesBrowser from '../../features/templates/components/TemplatesBrowser.jsx';

// B6 — the Templates library.
//
// Category → Use Case → Format, on the same browse shell as the Prompt Library
// (styles/browse.css). Every document is CMS content, and nothing reaches this
// page until its licence has been signed off in the CMS.
export default function TemplatesPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <TemplatesHero />
        <TemplatesBrowser />
      </PageLayout>
    </div>
  );
}
