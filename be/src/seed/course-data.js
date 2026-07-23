// Single, fully-populated course used by both the fresh seed and the
// `reset:courses` script, so the two never drift. Consumers add `publishedAt`.
import { CONTENT_STATUS, COURSE_STATE } from '../constants/statuses.js';

export const FEATURED_COURSE = {
  title: 'Introduction to Government Procurement',
  slug: 'introduction-to-government-procurement',
  resourceType: 'courses',
  segment: 'win', // drives the "Win Contracts" chip
  level: 'beginner',
  levelLabel: 'Foundational',
  summary:
    'Gain a clear understanding of how public sector buying works — from the ' +
    'underlying principles and policies that guide procurement, to the ' +
    'step-by-step processes that drive purchasing decisions.',
  instructor: {
    name: 'Instructor Name',
    role: 'Procurement Specialist',
    avatarUrl:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
  },
  price: 100,
  currency: 'AUD',
  sidebarSummary:
    'Understand how public sector buying works — from guiding principles to the ' +
    'processes behind every purchasing decision',
  image: {
    url: 'https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=1200&q=80',
  },
  media: [
    {
      kind: 'video',
      title: 'Course introduction',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mimeType: 'video/mp4',
      order: 0,
    },
  ],
  durationLabel: '20+ hours',
  learnPoints: [
    'Core principles of government procurement',
    'How to read and respond to tender documents',
    'Key differences public and private sector buying',
    'Roles and responsibilities of stakeholders',
    'The procurement cycle',
    'Applying ethical standards and probity in practice',
  ],
  requirements: [
    'A laptop or desktop with reliable internet access',
    'Curiosity, passion and the drive to learn',
  ],
  body:
    "<p>This course is designed to give you a comprehensive foundation in government " +
    "procurement. From the core principles of transparency, fairness, and " +
    "value-for-money to the practical steps of planning, tendering, evaluating, and " +
    "awarding contracts, you'll gain the skills to navigate the full procurement cycle " +
    "with confidence.</p>" +
    '<p>By the end of this course, you will be able to:</p>' +
    '<ul>' +
    '<li><strong>Understand the foundations of public procurement:</strong> Learn the ' +
    'policies, probity requirements, and principles that underpin every government ' +
    'purchase.</li>' +
    '<li><strong>Navigate the procurement process:</strong> Explore the stages from ' +
    'planning and market engagement to evaluation, award, and contract management.</li>' +
    '<li><strong>Analyse tender documents effectively:</strong> Recognise what buyers ' +
    'are looking for and how suppliers can best respond.</li>' +
    '<li><strong>Apply governance and risk management practices:</strong> Embed ' +
    'compliance and accountability in every step.</li>' +
    '<li><strong>Recognise the role of stakeholders:</strong> Understand the ' +
    'responsibilities of buyers, evaluators, suppliers, and oversight bodies in the ' +
    'procurement cycle.</li>' +
    '<li><strong>Develop practical skills:</strong> Work through scenarios and templates ' +
    'that mirror real government processes.</li>' +
    '</ul>' +
    "<p>This course is more than an introduction — it's a launchpad for anyone looking " +
    'to participate in, manage, or advise on government procurement. With the right ' +
    "knowledge and tools, you'll be equipped to contribute to fairer, more effective, " +
    'and more impactful outcomes in the public sector.</p>',
  whoShouldTake: [
    {
      title: 'Beginners and Early-Career Professionals',
      text: "If you're new to procurement or just starting your career, this course provides a strong foundation in the principles, policies, and processes of government buying.",
    },
    {
      title: 'Procurement Officers and Managers',
      text: 'Refresh and expand your knowledge with up-to-date practices, case studies, and insights to sharpen your decision-making and compliance skills.',
    },
    {
      title: 'Policy Makers and Public Servants',
      text: 'Gain clarity on how procurement underpins transparency, governance, and value-for-money in the public sector.',
    },
    {
      title: 'Suppliers and Contractors',
      text: 'Learn how buyers think, what they look for in tenders, and how to align your proposals with government expectations.',
    },
    {
      title: 'Career Transitioners',
      text: 'Build essential skills to enter the procurement field and understand the rules, ethics, and frameworks that guide public purchasing.',
    },
  ],
  includes: [
    '20+ hours of content',
    '110+ lessons',
    '10+ file resources',
    'Certificate of completion',
    'Subtitles: English',
  ],
  access: ['Online at your own pace', 'Lifetime access', 'Last update: June 2025'],
  availability: COURSE_STATE.OPEN,
  featured: true,
  status: CONTENT_STATUS.PUBLISHED,
};
