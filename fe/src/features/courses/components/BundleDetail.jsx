import { Link } from 'react-router-dom';
import LoadingStatus from '../../../components/shared/LoadingStatus.jsx';
import './BundleDetail.css';
import Arrow from '../../../components/shared/Arrow.jsx';

// Whole dollars: these are course prices, and the cents are always zero.
const formatPrice = (n, currency = 'AUD') =>
  Number(n) > 0
    ? new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(Number(n))
    : 'Free';

/* ---------------------------------------------------------------------------
   One course bundle.

   The page has one job: show what is in the bundle and what buying it together
   saves. Both numbers come from the server, computed from the courses' prices
   as they stand right now — nothing here re-derives them, so the page cannot
   advertise a saving the checkout would not honour.
   ------------------------------------------------------------------------ */
export default function BundleDetail({ bundle, status }) {
  // Blank while it waits — the bundle fades in on arrival rather than taking
  // the place of a line of holding copy.
  if (status === 'loading') {
    return (
      <section className="bundle hm-band--light">
        <LoadingStatus loading label="Loading bundle" />
      </section>
    );
  }

  if (status !== 'ready' || !bundle) {
    return (
      <section className="bundle hm-band--light">
        <div className="bundle__inner">
          <h1 className="bundle__title">Bundle not found</h1>
          <p className="bundle__state">
            {status === 'notfound'
              ? 'That bundle isn’t available.'
              : 'We couldn’t load this bundle right now. Please try again shortly.'}
          </p>
          <Link className="bundle__back" to="/courses">
            Back to all courses
          </Link>
        </div>
      </section>
    );
  }

  const courses = bundle.courses ?? [];

  return (
    <section className="bundle hm-band--light">
      <div className="bundle__inner">
        <Link className="bundle__back" to="/courses">
          <Arrow direction="left" /> All courses
        </Link>

        <header className="bundle__head">
          <span className="bundle__kicker">Bundle</span>
          <h1 className="bundle__title">{bundle.title}</h1>
          {bundle.summary ? <p className="bundle__summary">{bundle.summary}</p> : null}
        </header>

        <div className="bundle__cols">
          <div className="bundle__main">
            <h2 className="bundle__section">
              What’s included · {courses.length} {courses.length === 1 ? 'course' : 'courses'}
            </h2>

            {courses.length === 0 ? (
              <p className="bundle__state">
                The courses in this bundle aren’t available at the moment.
              </p>
            ) : (
              <ul className="bundle__list">
                {courses.map((c) => (
                  <li className="bundle__item" key={c._id}>
                    <Link className="bundle__item-link" to={`/courses/${c.slug}`}>
                      <span
                        className="bundle__item-art"
                        style={c.image?.url ? { backgroundImage: `url(${c.image.url})` } : undefined}
                        aria-hidden="true"
                      />
                      <span className="bundle__item-body">
                        <span className="bundle__item-title">{c.title}</span>
                        {c.summary ? (
                          <span className="bundle__item-summary">{c.summary}</span>
                        ) : null}
                      </span>
                      <span className="bundle__item-price">
                        {formatPrice(c.price, c.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {bundle.body ? (
              /* Sanitised server-side on write, the same as a course body. */
              <div className="bundle__body" dangerouslySetInnerHTML={{ __html: bundle.body }} />
            ) : null}
          </div>

          <aside className="bundle__side">
            <div className="bundle__box">
              <p className="bundle__price">{formatPrice(bundle.price, bundle.currency)}</p>
              {bundle.listPrice > bundle.price ? (
                <p className="bundle__was">
                  <s>{formatPrice(bundle.listPrice, bundle.currency)}</s> bought separately
                </p>
              ) : null}

              {bundle.saving > 0 ? (
                <p className="bundle__saving">
                  Save {formatPrice(bundle.saving, bundle.currency)} ({bundle.savingPercent}%)
                </p>
              ) : null}

              <Link className="bundle__cta" to="/learn/courses">
                Get this bundle
              </Link>

              <p className="bundle__note">
                Every course in the bundle is added to your account, with lifetime access and
                the certificate each one awards.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
