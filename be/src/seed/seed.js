// Idempotent seed: super-admin + rich starter content so the site and CMS have
// real data to show. Safe to run repeatedly (per-collection guards). Uploads a
// few sample images to S3 when it's configured.
//   npm run seed
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { connectDB, disconnectDB } from '../config/db.js';
import { env, s3Configured } from '../config/env.js';
import { ROLES } from '../constants/roles.js';
import { CONTENT_STATUS, COURSE_STATE, QUESTION_STATUS } from '../constants/statuses.js';
import { uploadBuffer } from '../config/s3.js';
import { User } from '../models/User.js';
import { Setting } from '../models/Setting.js';
import { Category } from '../models/Category.js';
import { Page } from '../models/Page.js';
import { Faq } from '../models/Faq.js';
import { Article } from '../models/Article.js';
import { Course } from '../models/Course.js';
import { Question } from '../models/Question.js';
import { Link } from '../models/Link.js';
import { Announcement } from '../models/Announcement.js';
import { toSlug } from '../utils/slugify.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, '../../../fe/src/assets/images');

// Relatable stock imagery (Unsplash) for seeded courses, artefacts and bundles,
// so a fresh install shows real, topical photos without depending on S3 uploads.
// Kept in sync with src/seed/update-media.js (which refreshes existing records).
const stock = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
const STOCK = {
  foundations: stock('photo-1450101499163-c8848c66ca85'),
  strategy: stock('photo-1454165804606-c3d57bc86b40'),
  probity: stock('photo-1521791136064-7986c2920216'),
  digital: stock('photo-1460925895917-afdab827c52f'),
  steps: stock('photo-1507925921958-8a62f3d1a50d'),
  scorecard: stock('photo-1554224155-6726b3ff858f'),
  checklist: stock('photo-1551288049-bebda4e38f71'),
  toolkit: stock('photo-1521737604893-d14cc237f11d'),
};

// Uploads a bundled sample image to S3; returns {key,url} or {} on any failure
// (so seeding never breaks if an asset or S3 is unavailable).
async function uploadSample(filename, folder) {
  if (!s3Configured) return {};
  try {
    const buffer = readFileSync(resolve(ASSETS, filename));
    const { key, url } = await uploadBuffer({
      buffer,
      mimeType: 'image/png',
      folder,
      originalName: filename,
    });
    return { key, url };
  } catch (err) {
    console.log(`[seed] image upload skipped for ${filename}: ${err.message}`);
    return {};
  }
}

async function upsertCategory(name, kinds) {
  const slug = toSlug(name);
  return Category.findOneAndUpdate(
    { slug },
    { $set: { name, kinds }, $setOnInsert: { slug } },
    { upsert: true, new: true },
  );
}

async function upsertPage(slug, title, body, updatedLabel) {
  return Page.findOneAndUpdate(
    { slug },
    { $set: { title, body, updatedLabel, status: CONTENT_STATUS.PUBLISHED }, $setOnInsert: { slug } },
    { upsert: true, new: true },
  );
}

const now = new Date();

async function run() {
  await connectDB();

  // 1. Super admin ----------------------------------------------------------
  if (!(await User.findOne({ email: env.seedAdmin.email }))) {
    await User.create({
      name: env.seedAdmin.name,
      email: env.seedAdmin.email,
      password: env.seedAdmin.password,
      role: ROLES.SUPERADMIN,
    });
    console.log(`[seed] created super-admin: ${env.seedAdmin.email}`);
  } else {
    console.log(`[seed] super-admin exists: ${env.seedAdmin.email}`);
  }

  // 2. Settings -------------------------------------------------------------
  const settings = await Setting.getSingleton();
  settings.seo.defaultDescription =
    'Advisory, training and tools to help you win and manage government contracts.';
  settings.contact.email = 'hello@governmentprocurement.example';
  settings.contact.phone = '+61 478 669 922';
  settings.social = {
    instagram: 'https://www.instagram.com/govprocurement/?hl=en',
    facebook: 'https://www.facebook.com/profile.php?id=61585039209265',
    linkedin: 'https://www.linkedin.com/company/governmentprocurement/',
    youtube: 'https://www.youtube.com/@GovernmentProcurement',
    tiktok: 'https://www.tiktok.com/@govprocurement',
    threads: 'https://www.threads.com/@govprocurement',
  };
  await settings.save();

  // 3. Categories -----------------------------------------------------------
  const [catStrategy, catP101, catPublic, catDigital, catWebinars, catCase, catTraining] =
    await Promise.all([
      upsertCategory('Strategy', ['article']),
      upsertCategory('Procurement 101', ['article', 'video']),
      upsertCategory('Public Sector', ['article']),
      upsertCategory('Digital', ['article', 'video']),
      upsertCategory('Webinars', ['video']),
      upsertCategory('Case Studies', ['video']),
      upsertCategory('Training', ['course']),
    ]);

  // 4. Pages (green legal + about) -----------------------------------------
  await Promise.all([
    upsertPage(
      'about',
      'About Government Procurement',
      '<p>For over two decades we have helped organisations across the public and private sectors win and manage government contracts.</p><p>Our team combines procurement advisory, training, and digital tools to make tendering fairer, faster, and more transparent.</p>',
      'September 2025',
    ),
    upsertPage(
      'privacy',
      'Privacy Policy',
      '<p>We are committed to protecting your privacy in line with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.</p>',
      'September 2025',
    ),
    upsertPage(
      'terms',
      'Terms of Use',
      '<p>By using this website you agree to these Terms of Use.</p>',
      'September 2025',
    ),
  ]);

  // 5. Articles -------------------------------------------------------------
  if ((await Article.countDocuments()) === 0) {
    const heroA = await uploadSample('MainPictureHomepage.png', 'articles');
    const heroB = await uploadSample('ExpertiseImage.png', 'articles');
    const heroC = await uploadSample('EnhanceExpImage.png', 'articles');
    const body =
      '<p>Procurement is no longer just about cost savings and compliance — it is a strategic, data-driven function.</p>' +
      '<h2>Why it matters</h2><p>Advanced analytics, AI, and real-time insights are reshaping procurement decision-making across the public sector.</p>' +
      '<ul><li>Better supplier engagement</li><li>Stronger probity and governance</li><li>Faster, defensible outcomes</li></ul>' +
      '<p>Organisations that treat procurement as a capability — not a cost centre — consistently deliver more value.</p>';
    await Article.create([
      {
        title: 'The Future of Procurement in a Data-Driven World',
        slug: 'future-of-procurement-data-driven',
        topic: 'Digital', category: catDigital._id, author: 'Dr. Amara Osei',
        excerpt: 'How analytics, AI and real-time insights are reshaping procurement decision-making.',
        body, heroImage: heroA, featured: true, readingMinutes: 6,
        status: CONTENT_STATUS.PUBLISHED, publishedAt: now,
      },
      {
        title: 'The Role of Governance and Probity in Fair Tendering',
        slug: 'governance-probity-fair-tendering',
        topic: 'Strategy', category: catStrategy._id, author: 'James Whitmore',
        excerpt: 'Robust governance protects agencies from risk and keeps tendering defensible.',
        body, heroImage: heroB, readingMinutes: 5,
        status: CONTENT_STATUS.PUBLISHED, publishedAt: now,
      },
      {
        title: 'How to Build a Procurement Strategy That Delivers Results',
        slug: 'build-procurement-strategy-delivers',
        topic: 'Strategy', category: catStrategy._id, author: 'Priya Nair',
        excerpt: 'A practical framework for turning procurement into a strategic capability.',
        body, heroImage: heroC, readingMinutes: 7,
        status: CONTENT_STATUS.PUBLISHED, publishedAt: now,
      },
      {
        title: 'The Procurement Lifecycle Explained in 7 Steps',
        slug: 'procurement-lifecycle-7-steps',
        topic: 'Procurement 101', category: catP101._id, author: 'James Whitmore',
        excerpt: 'From needs analysis to contract management — the full lifecycle, simply explained.',
        body, readingMinutes: 4, status: CONTENT_STATUS.PUBLISHED, publishedAt: now,
      },
      {
        title: 'Transparency in Tendering: Why It Matters for Trust',
        slug: 'transparency-tendering-trust',
        topic: 'Public Sector', category: catPublic._id, author: 'Dr. Amara Osei',
        excerpt: 'Transparency is the foundation of public trust in procurement.',
        body, readingMinutes: 5, status: CONTENT_STATUS.PUBLISHED, publishedAt: now,
      },
    ]);
    console.log('[seed] created 5 articles');
  }

  // 6. Courses --------------------------------------------------------------
  // A single, fully-populated course matching the marketing course-detail
  // layout. Shared with `npm run reset:courses` via course-data.js.
  if ((await Course.countDocuments()) === 0) {
    await Course.create({ ...FEATURED_COURSE, category: catTraining._id, publishedAt: now });
    console.log('[seed] created 1 course');
  }

  // 7. Forum Q&A ------------------------------------------------------------
  if ((await Question.countDocuments()) === 0) {
    await Question.create([
      {
        title: 'Lowest Bid But Non-Compliant', slug: 'lowest-bid-but-non-compliant',
        body: 'What happens if a supplier submits the lowest bid, but the evaluation panel finds gaps in compliance?',
        category: 'win', submitter: { name: 'A. Contractor', email: 'contractor@example.com' },
        answer: {
          paragraphs: [
            'The evaluation framework prioritises compliance and capability over price alone. Missing mandatory documentation creates a probity risk.',
            'The panel would mark the submission non-compliant and turn to the next highest-scoring supplier.',
          ],
          lessons: ['Lowest cost does not guarantee success.', 'Robust frameworks protect against risk.'],
          answeredAt: now,
        },
        status: QUESTION_STATUS.PUBLISHED, publishedAt: now,
      },
      {
        title: 'Missed Deadline by Minutes', slug: 'missed-deadline-by-minutes',
        body: 'A supplier uploads their tender a few minutes past close due to a technical issue. Can the agency accept it?',
        category: 'win',
        answer: {
          paragraphs: ['Closing times are generally strict; a late submission is usually non-conforming.', 'Limited discretion may apply where the delay was caused by the agency’s own systems.'],
          lessons: ['Submit early — leave a buffer.', 'Document any platform outage immediately.'],
          answeredAt: now,
        },
        status: QUESTION_STATUS.PUBLISHED, publishedAt: now,
      },
      {
        title: 'How Should Panels Weight Price vs Quality?', slug: 'weight-price-vs-quality',
        body: 'When designing an evaluation, how do we balance price against non-price criteria?',
        category: 'award',
        answer: {
          paragraphs: ['The weighting should reflect the outcome you are buying — complex services justify higher non-price weight.'],
          lessons: ['Publish the weightings up front.', 'Keep the method consistent across bidders.'],
          answeredAt: now,
        },
        status: QUESTION_STATUS.PUBLISHED, publishedAt: now,
      },
      // Two pending submissions so the moderation queue has something to action.
      // (No slug — it's assigned by the moderator on approve/publish.)
      {
        title: 'Can we shortlist before evaluating price?',
        body: 'Is it acceptable to shortlist on quality before opening the price envelope?',
        category: 'award', submitter: { name: 'New Buyer', email: 'buyer@example.com' },
        status: QUESTION_STATUS.SUBMITTED,
      },
      {
        title: 'Do we have to debrief unsuccessful bidders?',
        body: 'Are agencies required to offer a debrief to unsuccessful suppliers?',
        category: 'win', submitter: { name: 'Curious Supplier', email: 'supplier@example.com' },
        status: QUESTION_STATUS.SUBMITTED,
      },
    ]);
    console.log('[seed] created 5 forum questions (3 published, 2 pending)');
  }

  // 8. Tender + social links ------------------------------------------------
  if ((await Link.countDocuments()) === 0) {
    await Link.create([
      { group: 'tender', label: 'AusTender', url: 'https://www.tenders.gov.au', region: 'australia', description: 'Australian Government tenders.', order: 1 },
      { group: 'tender', label: 'NSW eTendering', url: 'https://www.tenders.nsw.gov.au', region: 'australia', description: 'NSW Government tenders.', order: 2 },
      { group: 'tender', label: 'Victorian Government Tenders', url: 'https://www.tenders.vic.gov.au', region: 'australia', description: 'Victorian tenders.', order: 3 },
      { group: 'tender', label: 'TED (Tenders Electronic Daily)', url: 'https://ted.europa.eu', region: 'featured', description: 'EU public procurement.', order: 4 },
      { group: 'tender', label: 'UN Global Marketplace', url: 'https://www.ungm.org', region: 'featured', description: 'United Nations procurement.', order: 5 },
      { group: 'tender', label: 'SAM.gov (USA)', url: 'https://sam.gov', region: 'featured', description: 'US federal contracting.', order: 6 },
      { group: 'social', label: 'LinkedIn', url: 'https://www.linkedin.com', platform: 'linkedin', order: 1 },
      { group: 'social', label: 'YouTube', url: 'https://www.youtube.com', platform: 'youtube', order: 2 },
      { group: 'social', label: 'X', url: 'https://x.com', platform: 'x', order: 3 },
    ]);
    console.log('[seed] created tender + social links');
  }

  // 9. FAQs ----------------------------------------------------------------
  if ((await Faq.countDocuments()) < 4) {
    await Faq.deleteMany({});
    await Faq.create([
      { question: 'What is Government Procurement?', answer: 'We help organisations win and manage government contracts through advisory, training, and tools.', category: 'Getting started', order: 1 },
      { question: 'How do I book a consultation?', answer: 'Use the “Book a Consultation” link in the header to request a session.', category: 'Getting started', order: 2 },
      { question: 'Do your courses count towards CPD?', answer: 'Yes — our courses provide a certificate of completion suitable for CPD records.', category: 'Courses', order: 3 },
      { question: 'Can I get a bid reviewed before submitting?', answer: 'Our advisory team offers tender reviews. Book a consultation to discuss scope.', category: 'Bidding & tenders', order: 4 },
      { question: 'How is my personal data handled?', answer: 'In line with the Privacy Act 1988 and our Privacy Policy. You can unsubscribe at any time.', category: 'Account & billing', order: 5 },
    ]);
    console.log('[seed] refreshed FAQs');
  }

  // 10. Announcement --------------------------------------------------------
  if ((await Announcement.countDocuments()) === 0) {
    await Announcement.create({
      message: 'New course now open: Winning Government Tenders — Foundations.',
      link: '/courses', linkLabel: 'Browse courses', tone: 'success', active: true,
    });
    console.log('[seed] created announcement');
  }

  console.log('[seed] done');
  await disconnectDB();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
