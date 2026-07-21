import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import ForumSidebar from './ForumSidebar.jsx';
import { ANSWERS_BY_CATEGORY, CATEGORY_LABEL } from '../data.js';
import './ForumAnswers.css';

const FEATURED = [
  { label: 'Lowest Price vs. Best Value', href: '/forum/articles' },
  { label: 'Missed Deadline', href: '/forum/articles' },
  { label: 'Balancing Sustainable Impact', href: '/forum/articles' },
  { label: 'Missed Deadline', href: '/forum/articles' },
  { label: 'Unrequested Innovation', href: '/forum/articles' },
];

export default function ForumAnswers({
  heading = 'Recent Answers',
  category = 'win',
}) {
  // resetKey replays the reveal animation whenever the category changes.
  const { ref, inView } = useInView({ resetKey: category });
  const answers = ANSWERS_BY_CATEGORY[category] ?? ANSWERS_BY_CATEGORY.win;
  const tag = CATEGORY_LABEL[category] ?? CATEGORY_LABEL.win;

  return (
    <section ref={ref} className={`forum-answers${inView ? ' is-in' : ''}`}>
      <div className="forum-answers__inner">
        <div className="forum-answers__main">
          <h2 className="forum-answers__heading">{heading}</h2>

          <ul className="forum-answers__list">
            {answers.map(({ id, title, date, body }, i) => (
              <li key={id} style={{ '--i': i }}>
                <Link className="forum-card" to={`/forum/articles?id=${id}`}>
                  <h3 className="forum-card__title">{title}</h3>
                  <div className="forum-card__meta">
                    <span className="forum-tag">{tag}</span>
                    <span className="forum-card__date">{date}</span>
                  </div>
                  <p className="forum-card__body">{body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <ForumSidebar featured={FEATURED} />
      </div>
    </section>
  );
}
