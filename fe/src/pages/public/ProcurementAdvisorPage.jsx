import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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

  // JURISDICTIONS now lists every jurisdiction, live or not, so being IN the
  // list is no longer proof there is a rule pack behind it. The `live` flag is,
  // and it has to be checked here: without it /advisory/vic would match, ask
  // for a pack that does not exist, and sit on "Loading the Victoria rules…"
  // forever. Not-live falls through to the redirect below.
  const live = JURISDICTIONS.find((j) => j.slug === jurisdiction && j.live) || null;

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
              {/* The title alone. The lede under it described the questions
                  that begin immediately below, so it delayed the thing it was
                  describing. */}
              <h1 className="pa-page__title hm-reveal">
                Rule-Based Guidance Specific to Jurisdiction for Officials
              </h1>
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
                  {/* PLACEHOLDER COPY — the client is supplying the real
                      wording. Keep the shape: what the tool is not (no AI, no
                      data collected), what it is (published rules, applied as
                      written), and the link to the privacy policy. */}
                  <p className="pa-disclaimer">
                    This tool is not AI-powered and collects no data about you or
                    what you enter. It applies the published procurement rules
                    for the jurisdiction you choose, as they are written, and is
                    general information rather than legal advice.{' '}
                    <Link to="/policies/privacy">Read our privacy policy</Link>.
                  </p>
                  <JurisdictionPicker showLogos />
                </>
              )}
            </div>
          </section>
        </div>
      </PageLayout>
    </div>
  );
}
