import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '../data.js';
import './ForumSidebar.css';

export default function ForumSidebar() {
  const [params] = useSearchParams();
  const activeCategory = params.get('category');

  return (
    <aside className="forum-sidebar">
      <h2 className="forum-sidebar__heading">Answer Categories</h2>
      <div className="forum-sidebar__cats">
        {CATEGORIES.map(({ key, label }) => (
          <Link
            key={key}
            className={`forum-cat${activeCategory === key ? ' is-active' : ''}`}
            to={`/q-and-a/categories?category=${key}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <hr className="forum-sidebar__divider" />
    </aside>
  );
}
