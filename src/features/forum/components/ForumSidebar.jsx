import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '../data.js';
import './ForumSidebar.css';

const DEFAULT_FEATURED = [
  { label: 'Lowest Price vs. Best Value', href: '/forum/articles' },
  { label: 'Missed Deadline', href: '/forum/articles' },
  { label: 'Balancing Sustainable Impact', href: '/forum/articles' },
  { label: 'Missed Deadline', href: '/forum/articles' },
  { label: 'Tied Scores', href: '/forum/articles' },
];

function ArrowUpRight() {
  return (
    <svg
      className="forum-sidebar__arrow"
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="8 7 17 7 17 16" />
    </svg>
  );
}

export default function ForumSidebar({ featured = DEFAULT_FEATURED }) {
  const [params] = useSearchParams();
  const activeCategory = params.get('category');

  return (
    <aside className="forum-sidebar">
      <h2 className="forum-sidebar__heading">Categories</h2>
      <div className="forum-sidebar__cats">
        {CATEGORIES.map(({ key, label }) => (
          <Link
            key={key}
            className={`forum-cat${activeCategory === key ? ' is-active' : ''}`}
            to={`/forum/categories?category=${key}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <hr className="forum-sidebar__divider" />

      <h2 className="forum-sidebar__heading">Featured Questions</h2>
      <ul className="forum-sidebar__featured">
        {featured.map(({ label, href }, i) => (
          <li key={`${label}-${i}`}>
            <a className="forum-sidebar__link" href={href}>
              {label}
              <ArrowUpRight />
            </a>
          </li>
        ))}
      </ul>

      <hr className="forum-sidebar__divider" />
    </aside>
  );
}
