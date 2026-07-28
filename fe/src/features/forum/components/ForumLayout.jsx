import { useAudience } from '../../../context/AudienceContext.jsx';
import './ForumLayout.css';

// Green page shell shared by every forum page: it owns the page background.
export default function ForumLayout({ children }) {
  const { audience } = useAudience();

  return (
    <div className="forum-page" data-audience={audience}>
      {children}
    </div>
  );
}
