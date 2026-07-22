// One-off enrichment: downloads topical images, uploads them to S3, assigns
// them to the seeded articles/courses, and replaces the placeholder bodies with
// longer, sensible content.  Run:  node src/seed/enrich.js
import { connectDB, disconnectDB } from '../config/db.js';
import { uploadBuffer } from '../config/s3.js';
import { Article } from '../models/Article.js';
import { Course } from '../models/Course.js';

const U = (id) => `https://images.unsplash.com/photo-${id}?w=1400&q=80&auto=format&fit=crop`;

async function fetchImage(id) {
  const res = await fetch(U(id));
  if (!res.ok) throw new Error(`image ${id} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

async function setImage(folder, slug, photoId) {
  const buffer = await fetchImage(photoId);
  return uploadBuffer({ buffer, mimeType: 'image/jpeg', folder, originalName: `${slug}.jpg` });
}

// --- Article content (image + rich body + excerpt) -------------------------
const ARTICLES = {
  'future-of-procurement-data-driven': {
    photo: '1460925895917-afdab827c52f',
    excerpt:
      'Analytics, AI and real-time data are turning procurement from a back-office cost centre into a strategic capability. Here is what that shift looks like in practice.',
    body: `
<p>For decades, procurement was measured almost entirely on savings and compliance. That framing is changing fast. As spend data becomes richer and analytics tools become cheaper, procurement teams are being asked a bigger question: how do we create value, not just control cost?</p>
<h2>From cost centre to strategic capability</h2>
<p>Data-driven procurement starts with visibility. When every contract, supplier and transaction sits in one place, patterns emerge — maverick spend, duplicate suppliers, contracts drifting past their review dates. Surfacing those patterns is the first, and often the most valuable, win.</p>
<h2>Where analytics adds the most value</h2>
<ul>
  <li><strong>Spend analysis:</strong> categorise and benchmark spend to find consolidation opportunities.</li>
  <li><strong>Supplier risk:</strong> monitor financial, delivery and compliance signals continuously rather than annually.</li>
  <li><strong>Demand forecasting:</strong> align sourcing with real usage instead of last year's budget line.</li>
  <li><strong>Evaluation support:</strong> use structured scoring to keep decisions consistent and defensible.</li>
</ul>
<h2>Getting started</h2>
<p>You do not need a data-science team to begin. Clean, centralised contract and spend records, a shared taxonomy, and a handful of tracked metrics will move most teams further than another tool ever could. The organisations winning here treat procurement as a capability to invest in — and the data as an asset, not an afterthought.</p>`,
  },
  'governance-probity-fair-tendering': {
    photo: '1486406146926-c627a92ad1ab',
    excerpt:
      'Strong governance is what keeps a tender fair, transparent and defensible. We look at the probity practices that protect both agencies and suppliers.',
    body: `
<p>Every competitive tender carries risk: of bias, of perceived unfairness, of a decision that cannot withstand scrutiny. Good governance and probity are the controls that keep the process clean and the outcome defensible.</p>
<h2>What probity actually means</h2>
<p>Probity is more than honesty — it is the demonstrable integrity of the process. It shows, through records and behaviour, that every bidder was treated equally and that the decision followed the published rules.</p>
<h2>The practices that matter</h2>
<ul>
  <li><strong>Conflict-of-interest declarations</strong> from every panel member, refreshed as shortlists change.</li>
  <li><strong>Consistent evaluation</strong> against pre-published criteria and weightings.</li>
  <li><strong>Clear audit trails</strong> — scores, notes and decisions captured as they happen.</li>
  <li><strong>Controlled communication</strong> so no bidder gains an information advantage.</li>
</ul>
<h2>Why it protects everyone</h2>
<p>Probity is often seen as red tape. In reality it protects the agency from challenge, protects suppliers from unfair treatment, and protects public confidence in how money is spent. When a decision is questioned, the documented process is the best defence there is.</p>`,
  },
  'build-procurement-strategy-delivers': {
    photo: '1521737604893-d14cc237f11d',
    excerpt:
      'A procurement strategy is more than a sourcing plan. Here is a practical framework for turning procurement into a function that delivers measurable results.',
    body: `
<p>Many "procurement strategies" are really just sourcing calendars. A strategy that delivers results starts earlier — with the outcomes the organisation is trying to buy, and the market that can supply them.</p>
<h2>Start with outcomes, not categories</h2>
<p>Before choosing a sourcing approach, get clear on what good looks like: service levels, total cost of ownership, risk appetite, and the non-price factors that genuinely matter. These become your evaluation criteria later.</p>
<h2>Understand the market</h2>
<p>Early market engagement tells you what is realistic. It reveals capacity, pricing norms and innovation you might otherwise miss — and it lets suppliers prepare, which improves the quality of bids you receive.</p>
<h2>Align stakeholders</h2>
<ul>
  <li>Agree the weightings <em>before</em> you go to market.</li>
  <li>Bring end-users into requirement setting, not just sign-off.</li>
  <li>Plan contract management from day one — value is realised after signature, not at it.</li>
</ul>
<p>Strategy is the difference between buying something and buying the right thing well. The framework is simple; the discipline to follow it is what delivers.</p>`,
  },
  'procurement-lifecycle-7-steps': {
    photo: '1450101499163-c8848c66ca85',
    excerpt:
      'From identifying a need to managing the contract, the procurement lifecycle has seven clear stages. Here is what happens at each one.',
    body: `
<p>Procurement can feel opaque from the outside, but almost every purchase follows the same seven-step lifecycle. Understanding it helps suppliers bid better and helps buyers run a cleaner process.</p>
<ol>
  <li><strong>Needs analysis</strong> — define the requirement and the outcome, not just the item.</li>
  <li><strong>Market analysis</strong> — understand supply, pricing and capability.</li>
  <li><strong>Sourcing strategy</strong> — choose the right approach (open tender, panel, direct).</li>
  <li><strong>Go to market</strong> — publish clear, fair documentation and criteria.</li>
  <li><strong>Evaluation</strong> — score consistently against the published criteria.</li>
  <li><strong>Award &amp; contract</strong> — negotiate, award, and debrief unsuccessful bidders.</li>
  <li><strong>Contract management</strong> — manage performance and capture the value promised.</li>
</ol>
<p>The steps most often rushed — needs analysis and contract management — are the ones that determine whether the whole exercise delivers. Time spent at the start and the end pays back many times over.</p>`,
  },
  'transparency-tendering-trust': {
    photo: '1497215728101-856f4ea42174',
    excerpt:
      'Transparency is the foundation of public trust in procurement. We look at why open, well-documented tendering matters — and how to do it well.',
    body: `
<p>Public procurement spends public money, so it is held to a higher standard: not just value, but visible fairness. Transparency is how that standard is met.</p>
<h2>Trust is the real currency</h2>
<p>When a process is open — clear criteria, published outcomes, accessible records — suppliers compete with confidence and citizens can see that decisions were made properly. When it is opaque, even a good decision invites suspicion.</p>
<h2>What transparent tendering looks like</h2>
<ul>
  <li>Requirements and evaluation criteria published up front.</li>
  <li>Consistent, recorded scoring against those criteria.</li>
  <li>Timely award notices and meaningful debriefs.</li>
  <li>Open contract data where appropriate, so spend can be tracked.</li>
</ul>
<h2>Balancing openness and confidentiality</h2>
<p>Transparency does not mean publishing everything — commercial-in-confidence information and personal data must still be protected. The goal is a process that is as open as possible and as closed as necessary, with the reasoning for both documented.</p>`,
  },
};

// --- Course content --------------------------------------------------------
const COURSES = {
  'winning-government-tenders-foundations': {
    photo: '1600880292203-757bb62b4baf',
    summary:
      'Everything you need to submit competitive, compliant government bids — from reading a tender correctly to writing responses that score.',
    body: `
<p>Most bids are lost on avoidable mistakes: missed mandatory requirements, weak responses to the evaluation criteria, or a price that ignores total cost. This foundational programme fixes that.</p>
<h2>What you'll learn</h2>
<ul>
  <li>How to read a tender and map every mandatory and weighted requirement.</li>
  <li>How to write responses that answer the criteria — and score.</li>
  <li>How evaluation panels actually assess bids, and how to make their job easy.</li>
  <li>How to build a compliant, competitive pricing schedule.</li>
</ul>
<h2>Who it's for</h2>
<p>Suppliers new to government work, and bid teams wanting a repeatable, higher-win-rate process.</p>
<h2>Format</h2>
<p>Six weeks of live workshops, real tender case studies, and downloadable templates and checklists you keep.</p>`,
  },
  'procurement-strategy-masterclass': {
    photo: '1552664730-d307ca884978',
    summary:
      'Design category strategies that deliver measurable value — covering market analysis, stakeholder alignment and total cost of ownership.',
    body: `
<p>This masterclass is for practitioners ready to move from running processes to shaping outcomes. You will build a category strategy end to end and pressure-test it against a real market.</p>
<h2>What you'll learn</h2>
<ul>
  <li>Category strategy frameworks and when to use each sourcing approach.</li>
  <li>Early market engagement that improves bid quality without compromising probity.</li>
  <li>Setting evaluation criteria and weightings that reflect real priorities.</li>
  <li>Total-cost-of-ownership modelling beyond the headline price.</li>
</ul>
<h2>Who it's for</h2>
<p>Experienced procurement and category managers in the public and private sectors.</p>
<h2>Format</h2>
<p>Four weeks of live sessions with a capstone strategy you present and refine.</p>`,
  },
  'probity-governance-public-procurement': {
    photo: '1517245386807-bb43f82c33c4',
    summary:
      'Keep your evaluations fair, transparent and defensible. A practical grounding in probity, conflict management and audit-ready record keeping.',
    body: `
<p>A single probity lapse can unravel an otherwise sound procurement. This course gives evaluation panels and procurement leads the tools to keep every decision defensible.</p>
<h2>What you'll learn</h2>
<ul>
  <li>What probity means in practice, and where processes most often go wrong.</li>
  <li>Identifying, declaring and managing conflicts of interest.</li>
  <li>Running consistent, well-documented evaluations.</li>
  <li>Building audit trails that stand up to challenge and review.</li>
</ul>
<h2>Who it's for</h2>
<p>Panel members, procurement officers, and governance and audit staff.</p>
<h2>Format</h2>
<p>Three weeks of live workshops with scenario exercises drawn from real cases.</p>`,
  },
  'digital-procurement-analytics': {
    photo: '1551288049-bebda4e38f71',
    summary:
      'Use data and AI to sharpen sourcing decisions — from spend analysis and supplier risk to demand forecasting and dashboards that get used.',
    body: `
<p>Data-driven procurement is no longer optional. This course shows how to turn scattered spend and contract data into decisions, without needing a data-science background.</p>
<h2>What you'll learn</h2>
<ul>
  <li>Building a clean spend taxonomy and a single source of truth.</li>
  <li>Spend analysis, supplier-risk monitoring and demand forecasting.</li>
  <li>Where AI genuinely helps in sourcing — and where it doesn't.</li>
  <li>Designing dashboards stakeholders actually use.</li>
</ul>
<h2>Who it's for</h2>
<p>Procurement professionals and analysts modernising how their team works.</p>
<h2>Format</h2>
<p>Five weeks of live, hands-on sessions using worked datasets.</p>`,
  },
};

async function run() {
  await connectDB();

  for (const [slug, data] of Object.entries(ARTICLES)) {
    const article = await Article.findOne({ slug });
    if (!article) { console.log('[enrich] article not found:', slug); continue; }
    try {
      const img = await setImage('articles', slug, data.photo);
      article.heroImage = { key: img.key, url: img.url, alt: article.title };
    } catch (e) { console.log('[enrich] image failed', slug, e.message); }
    article.excerpt = data.excerpt;
    article.body = data.body.trim();
    article.readingMinutes = Math.max(3, Math.round(data.body.split(/\s+/).length / 200));
    await article.save();
    console.log('[enrich] article:', slug);
  }

  for (const [slug, data] of Object.entries(COURSES)) {
    const course = await Course.findOne({ slug });
    if (!course) { console.log('[enrich] course not found:', slug); continue; }
    try {
      const img = await setImage('courses', slug, data.photo);
      course.image = { key: img.key, url: img.url };
    } catch (e) { console.log('[enrich] image failed', slug, e.message); }
    course.summary = data.summary;
    course.body = data.body.trim();
    await course.save();
    console.log('[enrich] course:', slug);
  }

  console.log('[enrich] done');
  await disconnectDB();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[enrich] failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
