import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import './SystemMessage.css';

// Shared shell for every system / utility page (404, 500, form-success and
// opt-in confirmation screens). Pages pass an eyebrow, title, message and a set
// of actions; the reveal animation matches the public heroes (useInView + is-in).
//
// actions: [{ label, to?, href?, variant? }]  variant: 'primary' | 'ghost'
export default function SystemMessage({
  code,
  eyebrow,
  title,
  message,
  children,
  actions = [],
}) {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });

  return (
    <section
      ref={ref}
      className={`sysmsg${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="sysmsg__inner">
        {code && <p className="sysmsg__code">{code}</p>}
        {eyebrow && <p className="sysmsg__eyebrow">{eyebrow}</p>}
        <h1 className="sysmsg__title">{title}</h1>
        {message && <p className="sysmsg__message">{message}</p>}
        {children && <div className="sysmsg__body">{children}</div>}

        {actions.length > 0 && (
          <div className="sysmsg__actions">
            {actions.map((a) => {
              const cls = `sysmsg__btn sysmsg__btn--${a.variant || 'primary'}`;
              if (a.to) {
                return (
                  <Link key={a.label} className={cls} to={a.to}>
                    {a.label}
                  </Link>
                );
              }
              return (
                <a key={a.label} className={cls} href={a.href}>
                  {a.label}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
