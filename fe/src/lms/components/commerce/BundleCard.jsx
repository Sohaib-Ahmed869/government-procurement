import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { formatMoney, gstInside } from '../../utils/money.js';

/* A bundle in the catalogue (C2).

   Deliberately not a CatalogCourseCard with different text. A bundle is a
   different kind of thing to buy — several courses at one price — and the two
   questions a buyer has are "what is in it" and "what does it save me". A card
   that looked like a course card would answer neither. */
export default function BundleCard({ bundle }) {
  const saving = Math.max(0, (bundle.listPrice ?? 0) - (bundle.price ?? 0));
  const percent = bundle.listPrice > 0 ? Math.round((saving / bundle.listPrice) * 100) : 0;

  return (
    <article className={`lms-bundlecard is-accent-${(bundle.accent ?? 0) % 6}`}>
      <div className="lms-bundlecard__head">
        <span className="lms-bundlecard__tag">
          <LmsIcon name="grid" />
          Bundle
        </span>
        {saving > 0 ? (
          <span className="lms-bundlecard__save">Save {formatMoney(saving)}{percent ? ` · ${percent}%` : ''}</span>
        ) : null}
      </div>

      <h3 className="lms-bundlecard__title">{bundle.title}</h3>
      {bundle.summary ? <p className="lms-bundlecard__summary">{bundle.summary}</p> : null}

      <p className="lms-bundlecard__meta">
        <LmsIcon name="book" />
        {bundle.courseCount} course{bundle.courseCount === 1 ? '' : 's'} included
      </p>

      <div className="lms-bundlecard__foot">
        <div className="lms-bundlecard__price">
          <span className="lms-bundlecard__amount">{formatMoney(bundle.price, bundle.currency)}</span>
          {/* Stated, not implied. The catalogue prices courses inclusive of GST
              and a bundle must read the same way. */}
          <span className="lms-bundlecard__gst">
            incl. {formatMoney(gstInside(bundle.price))} GST
          </span>
        </div>
        {/* Straight to checkout with the bundle in the basket. There is no
            separate bundle page inside the LMS — the public site has one at
            /bundles/:slug for the sales pitch, and this card is for someone
            already browsing to buy. */}
        <Link className="lms-btn lms-btn--primary lms-btn--sm" to={`/learn/checkout?bundle=${bundle.slug}`}>
          Buy bundle
        </Link>
      </div>
    </article>
  );
}
