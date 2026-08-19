import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { pagesApi } from '../../../api';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { POLICIES, SEARCH_THRESHOLD } from '../policies.js';
import './PolicyIndex.css';

// B5.2 the policy index.
//
// The set comes from policies.js, not from the CMS. A policy exists because the
// business says it does, and the page should list it whether or not anyone has
// written the words yet: a policy quietly missing from this index because its
// CMS page is unwritten would be worse than one listed as being prepared.
//
// What the CMS is consulted for is which of them are actually written, so each
// row can say so.
export default function PolicyIndex() {
  const { audience } = useAudience();
  const shown = useMountReveal();
  const [query, setQuery] = useState('');
  const [written, setWritten] = useState(null); // null = not known yet

  useEffect(() => {
    let alive = true;
    pagesApi
      .list({ limit: 100 })
      .then((items) => {
        if (!alive) return;
        setWritten(new Set((items || []).map((p) => p.slug)));
      })
      .catch(() => {
        // Unknown rather than empty. Without the list we cannot say a policy is
        // unwritten, and claiming it is would be worse than saying nothing.
        if (alive) setWritten(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = POLICIES.filter(
      (p) =>
        !needle ||
        p.title.toLowerCase().includes(needle) ||
        p.summary.toLowerCase().includes(needle) ||
        p.group.toLowerCase().includes(needle),
    );

    const out = [];
    for (const policy of matched) {
      let group = out.find((g) => g.name === policy.group);
      if (!group) {
        group = { name: policy.group, items: [] };
        out.push(group);
      }
      group.items.push(policy);
    }
    return out;
  }, [query]);

  const showSearch = POLICIES.length >= SEARCH_THRESHOLD;

  return (
    <section className={`polx${shown ? ' is-in' : ''}`} data-audience={audience}>
      <div className="polx__inner">
        {showSearch && (
          <div className="polx__search">
            <input
              className="polx__search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search policies"
              aria-label="Search policies"
            />
          </div>
        )}

        {groups.length === 0 && <p className="polx__empty">No policies match that search.</p>}

        {groups.map((group) => (
          <section className="polx-group" key={group.name}>
            <h2 className="polx-group__title">{group.name}</h2>

            <ul className="polx-list">
              {group.items.map((policy) => (
                <li className="polx-item" key={policy.slug}>
                  <Link className="polx-card" to={`/policies/${policy.slug}`}>
                    <span className="polx-card__title">{policy.title}</span>
                    <span className="polx-card__summary">{policy.summary}</span>
                    {/* Only ever says "being prepared", never "published". A
                        page existing in the CMS is not a promise that its
                        contents are final, so the row does not make one. */}
                    {written && !written.has(policy.slug) && (
                      <span className="polx-card__flag">Being prepared</span>
                    )}
                    <span className="polx-card__go" aria-hidden="true">
                      Read
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
