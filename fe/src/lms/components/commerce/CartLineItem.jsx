import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { formatMoney } from '../../utils/money.js';

// One line in the basket (C2).
export default function CartLineItem({ item, onRemove }) {
  return (
    <li className="lms-line">
      <span className={`lms-line__thumb is-accent-${item.accent % 6}`} aria-hidden="true">
        <LmsIcon name={item.kind === 'membership' ? 'badge' : 'book'} />
      </span>

      <span className="lms-line__body">
        <Link className="lms-line__title" to={`/learn/courses/${item.slug}`}>
          {item.title}
        </Link>
        <span className="lms-line__meta">
          {item.instructor} · {item.levelLabel} · {item.durationLabel}
        </span>
      </span>

      <span className="lms-line__price">
        {item.amount ? formatMoney(item.amount, item.currency) : 'Free'}
      </span>

      {onRemove ? (
        <button
          type="button"
          className="lms-btn lms-btn--sm lms-btn--ghost"
          onClick={() => onRemove(item.slug)}
          aria-label={`Remove ${item.title}`}
          title="Remove"
        >
          Remove
        </button>
      ) : null}
    </li>
  );
}
