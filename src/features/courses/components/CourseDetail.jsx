import { useInView } from '../../../hooks/useInView.js';
import courseVideo from '../../../assets/CourseVideo.mp4';
import './CourseDetail.css';

// Placeholder content. Real course data (title, instructor, video, curriculum,
// pricing) will come from the CMS/backend once wired up.
const COURSE_TITLE = 'Introduction to Government Procurement';
const COURSE_SUBTITLE =
  'Gain a clear understanding of how public sector buying works — from the underlying principles and policies that guide procurement, to the step-by-step processes that drive purchasing decisions.';

const WHAT_YOU_LEARN = [
  'Core principles of government procurement',
  'How to read and respond to tender documents',
  'Key differences public and private sector buying',
  'Roles and responsibilities of stakeholders',
  'The procurement cycle',
  'Applying ethical standards and probity in practice',
];

const REQUIREMENTS = [
  'A laptop or desktop with reliable internet access',
  'Curiosity, passion and the drive to learn',
];

const OUTCOMES = [
  {
    lead: 'Understand the foundations of public procurement:',
    body: 'Learn the policies, probity requirements, and principles that underpin every government purchase.',
  },
  {
    lead: 'Navigate the procurement process:',
    body: 'Explore the stages from planning and market engagement to evaluation, award, and contract management.',
  },
  {
    lead: 'Analyse tender documents effectively:',
    body: 'Recognise what buyers are looking for and how suppliers can best respond.',
  },
  {
    lead: 'Apply governance and risk management practices:',
    body: 'Embed compliance and accountability in every step.',
  },
  {
    lead: 'Recognise the role of stakeholders:',
    body: 'Understand the responsibilities of buyers, evaluators, suppliers, and oversight bodies in the procurement cycle.',
  },
  {
    lead: 'Develop practical skills:',
    body: 'Work through scenarios and templates that mirror real government processes.',
  },
];

const AUDIENCE = [
  {
    lead: 'Beginners and Early-Career Professionals:',
    body: "If you're new to procurement or just starting your career, this course provides a strong foundation in the principles, policies, and processes of government buying.",
  },
  {
    lead: 'Procurement Officers and Managers:',
    body: 'Refresh and expand your knowledge with up-to-date practices, case studies, and insights to sharpen your decision-making and compliance skills.',
  },
  {
    lead: 'Policy Makers and Public Servants:',
    body: 'Gain clarity on how procurement underpins transparency, governance, and value-for-money in the public sector.',
  },
  {
    lead: 'Suppliers and Contractors:',
    body: 'Learn how buyers think, what they look for in tenders, and how to align your proposals with government expectations.',
  },
  {
    lead: 'Career Transitioners:',
    body: 'Build essential skills to enter the procurement field and understand the rules, ethics, and frameworks that guide public purchasing.',
  },
];

const INCLUDES = [
  '20+ hours of content',
  '110+ lessons',
  '10+ file resources',
  'Certificate of completion',
  'Subtitles: English',
];

const ACCESS = [
  'Online at your own pace',
  'Lifetime access',
  'Last update: June 2025',
];

function CheckIcon() {
  return (
    <span className="cd-check" aria-hidden="true">
      ✓
    </span>
  );
}

function BookIcon() {
  return (
    <svg className="cd-book" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 6.5C10.5 5.3 8.7 4.8 6.5 4.8c-1 0-2 .1-2.9.4v12.6c.9-.3 1.9-.4 2.9-.4 2.2 0 4 .5 5.5 1.7M12 6.5c1.5-1.2 3.3-1.7 5.5-1.7 1 0 2 .1 2.9.4v12.6c-.9-.3-1.9-.4-2.9-.4-2.2 0-4 .5-5.5 1.7M12 6.5V19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CourseDetail() {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} className={`cd${inView ? ' is-in' : ''}`}>
      <div className="cd__inner">
        {/* --- main column --- */}
        <div className="cd__main">
          <h1 className="cd__title">{COURSE_TITLE}</h1>
          <p className="cd__subtitle">{COURSE_SUBTITLE}</p>

          <div className="cd-instructor">
            <span className="cd-instructor__avatar" aria-hidden="true" />
            <span className="cd-instructor__name">Instructor Name</span>
            <span className="cd-instructor__tags">
              <span className="cd-instructor__tag">6+ Courses</span>
              <span className="cd-instructor__level">Foundational</span>
            </span>
          </div>

          {/* Course preview video. Real per-course video will come from the CMS/backend later. */}
          <video className="cd-video" controls preload="metadata">
            <source src={courseVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <div className="cd-panel">
            <h2 className="cd-panel__title">What you'll learn</h2>
            <ul className="cd-learn">
              {WHAT_YOU_LEARN.map((item) => (
                <li key={item} className="cd-learn__item">
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="cd-panel">
            <h2 className="cd-panel__title">Requirements</h2>
            <ul className="cd-bullets">
              {REQUIREMENTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="cd-section">
              <h2 className="cd-section__title">Course description</h2>
              <p className="cd-section__para">
                This course is designed to give you a comprehensive foundation in government
                procurement. From the core principles of transparency, fairness, and
                value-for-money to the practical steps of planning, tendering, evaluating, and
                awarding contracts, you'll gain the skills to navigate the full procurement cycle
                with confidence.
              </p>
              <p className="cd-section__para">By the end of this course, you will be able to:</p>
              <ul className="cd-rich-list">
                {OUTCOMES.map((o) => (
                  <li key={o.lead}>
                    <strong>{o.lead}</strong> {o.body}
                  </li>
                ))}
              </ul>
              <p className="cd-section__para">
                This course is more than an introduction — it's a launchpad for anyone looking to
                participate in, manage, or advise on government procurement. With the right
                knowledge and tools, you'll be equipped to contribute to fairer, more effective,
                and more impactful outcomes in the public sector.
              </p>
            </div>

            <div className="cd-section">
              <h2 className="cd-section__title">Who should take this course?</h2>
              <ul className="cd-rich-list">
                {AUDIENCE.map((a) => (
                  <li key={a.lead}>
                    <strong>{a.lead}</strong> {a.body}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* --- pricing sidebar --- */}
        <aside className="cd__aside">
          <div className="cd-buy">
            <h2 className="cd-buy__title">Start learning today!</h2>
            <p className="cd-buy__blurb">
              Understand how public sector buying works — from guiding principles to the
              processes behind every purchasing decision
            </p>
            <p className="cd-buy__price">
              $100 <span className="cd-buy__currency">AUD</span>
            </p>
            <button type="button" className="cd-buy__cta">
              Buy course
            </button>

            <p className="cd-buy__group-label">This includes</p>
            <ul className="cd-buy__list">
              {INCLUDES.map((item) => (
                <li key={item} className="cd-buy__row">
                  <BookIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="cd-buy__group-label">Access</p>
            <ul className="cd-buy__list">
              {ACCESS.map((item) => (
                <li key={item} className="cd-buy__row">
                  <BookIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Small screens replace the pricing sidebar with a sticky bottom bar. */}
      <div className="cd-bar">
        <span className="cd-bar__title">{COURSE_TITLE}</span>
        <span className="cd-bar__price">$100</span>
        <button type="button" className="cd-bar__cta">
          Buy course
        </button>
      </div>
    </section>
  );
}
