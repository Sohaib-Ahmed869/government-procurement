import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import './Breadcrumbs.css';

// Interior-page breadcrumb trail (PRD FR-38). Pass items as
// [{ label, to? }] — the last item is rendered as the current page (no link).
// Home is prepended automatically.
export default function Breadcrumbs({ items = [] }) {
  const trail = [{ label: 'Home', to: '/' }, ...items];

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {trail.map((item, i) => {
          const isLast = i === trail.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="breadcrumbs__item">
                {isLast || !item.to ? (
                  <span className="breadcrumbs__current" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link className="breadcrumbs__link" to={item.to}>
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li className="breadcrumbs__sep" aria-hidden="true">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
