import { useInView } from '../../../hooks/useInView.js';
import targetIcon from '../../../assets/icons/Target.png';
import docsIcon from '../../../assets/icons/Google Docs.png';
import './AboutExpertise.css';

const PARAGRAPHS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
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
