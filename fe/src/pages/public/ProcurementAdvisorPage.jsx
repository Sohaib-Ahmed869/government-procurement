import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { useMountReveal } from '../../hooks/useMountReveal.js';
import AdvisorStepper from '../../features/advisor/components/AdvisorStepper.jsx';
import JurisdictionPicker from '../../features/advisor/components/JurisdictionPicker.jsx';
import { JURISDICTIONS, getRulePack } from '../../features/advisor/jurisdictions.js';
import { useAudience } from '../../context/AudienceContext.jsx';
import './ProcurementAdvisorPage.css';

// A6 — the Procurement Advisor.
//
// Two states, chosen by the URL: /advisory lists the jurisdictions, and
// /advisory/nsw runs the stepper for one. Keeping the jurisdiction in the path
// means a visitor can be sent straight to the one that applies to them, and the
// back button steps out of the tool rather than out of the site.
//
// NOTHING IS STORED (A6.8). Answers live in the stepper's own state for the
// length of the visit. There is no fetch, no localStorage, no analytics event,
// and no answer ever reaches the server. The rule pack is a static import, so
// even loading the tool makes no request carrying anything the visitor typed.
export default function ProcurementAdvisorPage() {
  const { audience } = useAudience();
  const { jurisdiction } = useParams();
  const navigate = useNavigate();
  const [rules, setRules] = useState(null);

  // This header used to have no reveal at all: the title and lede simply
  // appeared while every other page's faded and lifted. Same hook, same
  // .hm-reveal, same --gp-reveal-* timings as the rest.
  const mounted = useMountReveal();

  // Every entry in JURISDICTIONS is live — the ones that aren't simply aren't
  // listed — so finding one is the whole check.
  const live = JURISDICTIONS.find((j) => j.slug === jurisdiction) || null;

  useEffect(() => {
    let alive = true;
    if (!live) {
      setRules(null);
      return undefined;
    }
    getRulePack(live.slug).then((pack) => {
      if (alive) setRules(pack);
    });
    return () => {
      alive = false;
    };
  }, [live]);

  // A jurisdiction in the URL that isn't live goes back to the picker rather
  // than showing a tool that cannot run.
  useEffect(() => {
    if (jurisdiction && !live) navigate('/advisory', { replace: true });
  }, [jurisdiction, live, navigate]);

  const exit = () => navigate('/advisory');

  return (
    <div className="page-scale">
      <PageLayout>
        <div className="pa-page" data-audience={audience}>
          <header className={`pa-page__head${mounted ? ' is-in' : ''}`}>
            <div className="pa-page__shell">
              <h1 className="pa-page__title hm-reveal">Procurement Advisor</h1>
              <p className="pa-page__lede hm-reveal" data-delay="1">
                {live
                  ? 'Answer the questions below and the advisor sets out the procurement approach the rules require, the pathways open to you, and the obligations that attach to each.'
                  : 'Answer a short series of questions about what you are buying and how much you expect to spend, and the advisor points you to the procurement approach the rules require in your jurisdiction.'}
              </p>
            </div>
          </header>

          <section className="pa-page__body">
            <div className="pa-page__shell">
              {live && rules ? (
                <AdvisorStepper rules={rules} onExit={exit} key={live.slug} />
              ) : live ? (
                <p className="pa-note">Loading the {live.name} rules…</p>
              ) : (
                <>
                  <JurisdictionPicker />
                  <p className="pa-note">
                    More jurisdictions follow. New South Wales is the launch jurisdiction.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </PageLayout>
    </div>
  );
}
