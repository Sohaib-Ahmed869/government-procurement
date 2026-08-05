import { pageHeroApi } from '../../api';
import HeroCopyEditor from '../components/HeroCopyEditor.jsx';

// Capabilities page hero copy, edited the same way as the homepage hero.
export default function CapabilitiesPage() {
  return (
    <HeroCopyEditor
      title="Capabilities"
      subtitle="The eyebrow, heading and sub-heading at the top of the Capabilities page. Each segment has its own copy — pick a tab to edit that version."
      load={() => pageHeroApi.get('capabilities')}
      save={(audience, body) => pageHeroApi.save('capabilities', audience, body)}
    />
  );
}
