import { useInView } from '../../../hooks/useInView.js';
import targetIcon from '../../../assets/icons/Target.png';
import docsIcon from '../../../assets/icons/Google Docs.png';
import './AboutExpertise.css';

const PARAGRAPHS = [
  'We help public sector teams and suppliers get government procurement right — from shaping a sourcing strategy to running fair, defensible tenders that stand up to scrutiny.',
  'Our advisors have sat on both sides of the table, evaluating bids and writing them. That experience shapes practical guidance you can act on, not theory.',
  'Whether you are building capability across a procurement function or preparing a single high-stakes tender, we tailor our support to where you are and what you need to achieve.',
  'The result is stronger competition, better value for money, and outcomes that are transparent and easy to justify to stakeholders and auditors alike.',
];

const EXPERTISE = [
  { icon: targetIcon, title: 'Strategy Development' },
  { icon: docsIcon, title: 'Tender Design & Documentation' },
  { icon: targetIcon, title: 'Evaluation & Assessment' },
  { icon: docsIcon, title: 'Capacity Building & Training' },
];

export default function AboutExpertise() {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} className={`ab${inView ? ' is-in' : ''}`}>
      <div className="ab__inner">
        <div className="ab__content">
          <h2 className="ab__heading">About</h2>
          {PARAGRAPHS.map((p, i) => (
            <p className="ab__para" key={i}>
              {p}
            </p>
          ))}

          <h2 className="ab__heading ab__heading--expertise">Expertise</h2>
          <ul className="ab__list">
            {EXPERTISE.map((item) => (
              <li className="ab__row" key={item.title}>
                <span className="ab__icon">
                  <img src={item.icon} alt="" />
                </span>
                <span className="ab__row-title">{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
