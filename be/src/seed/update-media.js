// One-off, idempotent media/info refresh: points seeded courses, artefacts and
// bundles at relatable stock imagery (Unsplash) and richer copy. Safe to re-run.
//   node src/seed/update-media.js
import { connectDB, disconnectDB } from '../config/db.js';
import { Course } from '../models/Course.js';

const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

// slug -> { image, summary, body }
const MEDIA = {
  'winning-government-tenders-foundations': {
    image: U('photo-1450101499163-c8848c66ca85'),
    summary: 'Everything you need to submit competitive, compliant bids that score well.',
    body:
      "<p>A practical foundation course for anyone responsible for responding to government tenders. Learn how buyers evaluate submissions and how to give them exactly what they're looking for.</p>" +
      '<ul><li>Decode tender documents, selection criteria and weightings</li><li>Write clear, compliant, evidence-backed responses</li><li>Avoid the common mistakes that get bids marked down or disqualified</li></ul>',
  },
  'procurement-strategy-masterclass': {
    image: U('photo-1454165804606-c3d57bc86b40'),
    summary: 'Design category strategies that deliver measurable, defensible value.',
    body:
      '<p>Move from reactive buying to a deliberate sourcing strategy. This masterclass covers category management, market analysis and stakeholder alignment.</p>' +
      '<ul><li>Build category and sourcing strategies from the ground up</li><li>Run robust market and spend analysis</li><li>Balance value for money with risk and social outcomes</li></ul>',
  },
  'probity-governance-public-procurement': {
    image: U('photo-1521791136064-7986c2920216'),
    summary: 'Keep your evaluations fair, transparent and audit-ready.',
    body:
      '<p>Probity is what makes a procurement decision defensible. Learn how to run processes that stand up to scrutiny from bidders, auditors and the public.</p>' +
      '<ul><li>Manage conflicts of interest and confidentiality</li><li>Document decisions so they withstand challenge</li><li>Apply governance frameworks across the procurement lifecycle</li></ul>',
  },
  'digital-procurement-analytics': {
    image: U('photo-1460925895917-afdab827c52f'),
    summary: 'Use data and AI to sharpen every sourcing decision.',
    body:
      '<p>Procurement is becoming a data discipline. This course shows you how to turn spend and performance data into better, faster decisions.</p>' +
      '<ul><li>Build dashboards that surface spend and savings</li><li>Use analytics to manage supplier performance and risk</li><li>Understand where AI genuinely helps in the procurement cycle</li></ul>',
  },
  'steps-in-the-procurement-cycle': {
    image: U('photo-1507925921958-8a62f3d1a50d'),
    summary: 'A one-page map of every stage from identifying a need to awarding a contract.',
    body:
      '<p>A clear, printable reference that walks through each phase of the procurement cycle — need identification, market analysis, sourcing strategy, tendering, evaluation, award and contract management.</p>' +
      '<p>Use it to onboard new team members or to keep a live project on track.</p>',
  },
  'tender-evaluation-scorecard': {
    image: U('photo-1554224155-6726b3ff858f'),
    summary: 'A weighted price-vs-quality scoring sheet, ready for your evaluation panel.',
    body:
      '<p>A structured scorecard that helps panels evaluate tenders consistently and defensibly. Set your criteria, assign weightings, and let the sheet calculate a transparent overall score.</p>' +
      '<ul><li>Configurable criteria and weightings</li><li>Separate price and quality scoring</li><li>Built-in guidance notes for evaluators</li></ul>',
  },
  'bid-no-bid-decision-checklist': {
    image: U('photo-1551288049-bebda4e38f71'),
    summary: 'Qualify opportunities fast — before you commit time and resources.',
    body:
      '<p>A short, structured checklist to decide whether an opportunity is worth pursuing. Weigh fit, capability, competition and commercial return before you invest in a full response.</p>' +
      '<ul><li>Score strategic fit and win probability</li><li>Flag resourcing and compliance risks early</li><li>Make go/no-go calls with confidence</li></ul>',
  },
  'complete-tendering-toolkit': {
    image: U('photo-1521737604893-d14cc237f11d'),
    summary: 'Every template, checklist and course you need to win work — bundled at a saving.',
    body:
      '<p>Our most popular courses and artefacts, packaged together at a discount. Everything a bidding team needs to go from opportunity to submitted, competitive tender.</p>' +
      '<ul><li>Foundations and strategy courses</li><li>Evaluation scorecard and decision checklists</li><li>The full procurement-cycle reference</li></ul>',
  },
};

async function run() {
  await connectDB();
  let updated = 0;
  for (const [slug, m] of Object.entries(MEDIA)) {
    const res = await Course.updateOne(
      { slug },
      { $set: { image: { key: '', url: m.image }, summary: m.summary, body: m.body } },
    );
    if (res.matchedCount) updated += 1;
    console.log(`${res.matchedCount ? 'updated' : 'missing'}: ${slug}`);
  }
  console.log(`[update-media] done — ${updated}/${Object.keys(MEDIA).length} updated`);
  await disconnectDB();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
