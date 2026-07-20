import { useInView } from '../../../hooks/useInView.js';
import ForumSidebar from './ForumSidebar.jsx';
import { CATEGORY_LABEL } from '../data.js';
import './ForumArticle.css';

export default function ForumArticle({ article }) {
  // resetKey replays the reveal animation when navigating between articles.
  const { ref, inView } = useInView({ resetKey: article.id });

  return (
    <section ref={ref} className={`forum-article${inView ? ' is-in' : ''}`}>
      <div className="forum-article__inner">
        <div className="forum-article__main">
          <h1 className="forum-article__title">{article.title}</h1>
          <div className="forum-article__meta">
            <span className="forum-tag">{CATEGORY_LABEL[article.category]}</span>
            <span className="forum-article__date">{article.date}</span>
          </div>

          <article className="forum-article__box">
            <h2 className="forum-article__box-heading">Question</h2>
            <p className="forum-article__q">{article.body}</p>
          </article>

          <article className="forum-article__box">
            <h2 className="forum-article__box-heading">Answer</h2>
            {article.answer.map((p, i) => (
              <p className="forum-article__p" key={i}>
                {p}
              </p>
            ))}

            <p className="forum-article__lesson-label">Lesson:</p>
            <ul className="forum-article__lesson">
              {article.lesson.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <ForumSidebar />
      </div>
    </section>
  );
}
