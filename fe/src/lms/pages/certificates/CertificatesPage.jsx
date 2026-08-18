import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import CertificateCard from '../../components/certificates/CertificateCard.jsx';
import { useCertificates } from '../../hooks/useCertificates.js';
import { usePaths } from '../../hooks/usePaths.js';

// Earned certificates, plus the ones in reach (L4). Showing what is still
// outstanding is the point. A page that only lists what you already have gives
// a learner no reason to come back to it.
export default function CertificatesPage() {
  const { certificates, status } = useCertificates();
  const { paths } = usePaths();
  const inProgress = paths.filter((p) => !p.complete);

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Certificates</h1>
          <p className="lms-page__subtitle">
            Certificates you’ve earned, and the programs still in progress.
          </p>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '40%' }} />
        </div>
      ) : certificates.length === 0 ? (
        <div className="lms-card">
          <p className="lms-empty">
            No certificates yet. Complete a course to earn your first one.
          </p>
        </div>
      ) : (
        <div className="lms-cert-grid">
          {certificates.map((c) => (
            <CertificateCard key={c.id} certificate={c} />
          ))}
        </div>
      )}

      {inProgress.length ? (
        <section className="lms-card" style={{ marginTop: 22 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="path" />
              In progress
            </h2>
          </div>
          <div className="lms-list">
            {inProgress.map((p) => (
              <Link key={p.id} to={`/learn/paths/${p.slug}`} className="lms-list__item">
                <span className="lms-list__icon"><LmsIcon name="award" /></span>
                <span className="lms-list__body">
                  <span className="lms-list__title">{p.certificateTitle}</span>
                  <span className="lms-list__meta">
                    {p.doneCount} of {p.steps.length} courses complete
                  </span>
                </span>
                <span className="lms-list__trail">{p.percent}%</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
