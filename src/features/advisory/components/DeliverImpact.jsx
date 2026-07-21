import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import targetIcon from '../../../assets/icons/Target.png';
import docsIcon from '../../../assets/icons/Google Docs.png';
import graphIcon from '../../../assets/icons/Auto graph.png';
import './DeliverImpact.css';

const CARDS = [
  {
    icon: targetIcon,
    title: 'Strategy Development',
    body: "We craft comprehensive bid strategies that not only showcase your organisation's unique strengths, but also align seamlessly with buyer expectations.",
  },
  {
    icon: docsIcon,
    title: 'Tender Design & Documentation',
    body: 'Building persuasive proposals, pricing models, and supporting documentation that address requirements clearly and convincingly.',
  },
  {
    icon: graphIcon,
    title: 'Evaluation & Assessment',
    body: 'Structuring responses to meet evaluation criteria and demonstrate measurable value, ensuring your bid stands out.',
  },
];

export default function DeliverImpact() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      className={`di${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="di__inner">
        <h2 className="di__heading">Deliver with Impact</h2>

        <div className="di__grid">
          {CARDS.map((c) => (
            <article className="di__card" key={c.title}>
              <span className="di__icon">
                <img src={c.icon} alt="" />
              </span>
              <h3 className="di__card-title">{c.title}</h3>
              <p className="di__card-body">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
