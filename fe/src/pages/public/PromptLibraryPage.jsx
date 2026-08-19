import PageLayout from '../../components/layout/PageLayout.jsx';
import PromptsHero from '../../features/prompts/components/PromptsHero.jsx';
import PromptsBrowser from '../../features/prompts/components/PromptsBrowser.jsx';

// B4 — the AI Prompt Library.
//
// Main Topic → Use Case → AI Tool, laid out on the Courses page's browse
// structure. Every prompt is CMS content; the topics and tools are fixed sets
// and the use cases are whatever an editor has written.
export default function PromptLibraryPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <PromptsHero />
        <PromptsBrowser />
      </PageLayout>
    </div>
  );
}
