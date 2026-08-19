import { homeHeroApi } from '../../api';
import HeroCopyEditor from '../components/HeroCopyEditor.jsx';

// Homepage hero copy. The editor itself is shared with the other pages whose
// hero is editable; this only supplies the copy and the two API calls.
export default function HomeHeroPage() {
  return (
    <HeroCopyEditor
      title="Homepage hero"
      subtitle="The eyebrow, heading and sub-heading at the top of the homepage. Each segment has its own copy. Pick a tab to edit that version."
      load={() => homeHeroApi.get()}
      save={(audience, body) => homeHeroApi.save(audience, body)}
    />
  );
}
