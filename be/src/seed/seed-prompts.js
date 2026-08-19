// B4 seeds a starter set for the AI Prompt Library:
//   npm run seed:prompts
//
// EVERYTHING IS SEEDED AS A DRAFT. These are drafted for review, not approved
// content. A draft is visible on the live page to signed-in staff and to nobody
// else, so the set can be read in place, edited, and published one at a time
// from Content > AI Prompt Library.
//
// Two things to check before publishing any of them:
//
//   1. The prompts have been WRITTEN but not RUN. Each is assigned to the tool
//      whose behaviour it suits, but none has been executed against that tool
//      and had its output judged. That is a review step nobody else can do.
//   2. Anything touching thresholds, rules or obligations tells the user to
//      verify against the source. Procurement rules move, and an assistant will
//      state an out-of-date threshold with complete confidence. Those cautions
//      are in `notes`, which is shown on the card and never copied.
//
// Placeholders use {{DOUBLE_BRACES}} so they are obvious on the card and
// obvious in the tool once pasted.
//
// Upserts on mainTopic + title, so re-running will not duplicate anything and
// will not touch `status` on a prompt already reviewed and published.
import { connectDB, disconnectDB } from '../config/db.js';
import { Prompt } from '../models/Prompt.js';

const VERIFY =
  'Check every rule, threshold or dollar figure it gives you against the official source before relying on it. Procurement rules change and an assistant will state an out-of-date figure confidently.';

const PROMPTS = [
  // ===================== AWARD CONTRACTS (buying) =====================
  {
    mainTopic: 'award',
    useCase: 'Planning the procurement',
    useCaseOrder: 10,
    tool: 'claude',
    title: 'Set out the approach to market options',
    order: 10,
    body: `You are an experienced Australian public sector procurement adviser.

I am buying: {{WHAT YOU ARE BUYING}}
Estimated value (ex GST): {{VALUE}}
Jurisdiction: {{FEDERAL / NSW / VIC / QLD / SA / WA / TAS / ACT / NT}}
Timeframe: {{HOW LONG UNTIL IT MUST BE IN PLACE}}
Constraints: {{ANYTHING FIXED, e.g. existing panel, incumbent, budget cycle}}

Set out the approaches to market realistically open to me. For each one give:
1. What it is, in one sentence.
2. Why it might suit this purchase specifically.
3. What it would cost me in time.
4. The main risk of choosing it here.

Then recommend one and say plainly what would have to be true for your
recommendation to be wrong.

Do not tell me the approach is mandated by a rule unless you name the rule and
the clause. Where you are unsure which rule applies, say so and tell me what to
look up instead of guessing.`,
    notes: `Written to force options rather than a single answer, and to make the assistant name its sources. ${VERIFY}`,
  },
  {
    mainTopic: 'award',
    useCase: 'Planning the procurement',
    useCaseOrder: 10,
    tool: 'chatgpt',
    title: 'Draft a procurement risk register',
    order: 20,
    body: `Act as a procurement risk facilitator.

Procurement: {{WHAT YOU ARE BUYING}}
Value: {{VALUE}}
Market: {{HOW MANY CAPABLE SUPPLIERS YOU BELIEVE EXIST}}
What worries you most: {{YOUR CONCERN}}

Produce a risk register as a table with these columns: risk, category
(market / process / probity / delivery / commercial), likelihood, consequence,
treatment, and who owns it.

Rules:
- 10 to 15 risks. Cover the whole lifecycle, not just going to market.
- No generic entries. Every risk must name something specific to this purchase.
- Include at least two risks that arise from how the process itself is run,
  not from suppliers.
- Finish with the three risks I should raise with the decision maker, and why
  those three.`,
    notes:
      'The "no generic entries" instruction matters. Without it the output is a boilerplate register that could belong to any procurement.',
  },
  {
    mainTopic: 'award',
    useCase: 'Writing the specification',
    useCaseOrder: 20,
    tool: 'chatgpt',
    title: 'Turn a wish list into an outcomes based specification',
    order: 10,
    body: `You are helping me write a specification for a government procurement.

Here is what the business area has asked for, in their words:
"""
{{PASTE THE REQUEST AS YOU RECEIVED IT}}
"""

Rewrite this as an outcomes based specification. For each item:
- State the outcome required, not the product or brand that delivers it.
- Give a measure that shows the outcome has been met.
- Mark it as Mandatory or Desirable, and say why you classified it that way.

Then list separately:
- Anything in the original that names a brand, product or supplier, and a
  neutral way to express the same need.
- Anything that is really a preference rather than a requirement.
- Anything so vague that two suppliers could read it differently, with a
  question I should take back to the business area.`,
    notes:
      'The last section is the useful part. Ambiguity found before market is a clarification; found after, it is an addendum or a challenge.',
  },
  {
    mainTopic: 'award',
    useCase: 'Writing the specification',
    useCaseOrder: 20,
    tool: 'claude',
    title: 'Read a draft specification back as a bidder would',
    order: 20,
    body: `Read the specification below as if you are a supplier deciding whether to
bid, and then as a supplier looking for room to move later.

"""
{{PASTE THE DRAFT SPECIFICATION}}
"""

Tell me:
1. Every requirement that could reasonably be read two ways, with both readings.
2. Anywhere a supplier could comply on the words while missing the intent.
3. What a bidder would price as risk because we have not been clear, and what
   that vagueness is likely to cost us in the responses.
4. Any requirement that appears to favour one kind of supplier, whether or not
   we intended it.

Quote the exact wording each time. Do not rewrite the specification; I want the
problems, not a new draft.`,
    notes:
      'Deliberately asks for problems only. A rewritten draft is hard to compare against the original and hides what changed.',
  },
  {
    mainTopic: 'award',
    useCase: 'Evaluation criteria',
    useCaseOrder: 30,
    tool: 'claude',
    title: 'Draft weighted evaluation criteria',
    order: 10,
    body: `You are advising on the evaluation of an Australian government procurement.

What is being bought: {{WHAT YOU ARE BUYING}}
What good looks like: {{WHAT A SUCCESSFUL OUTCOME IS}}
Non negotiables: {{ANY MANDATORY REQUIREMENTS}}
Value: {{VALUE}}

Draft a set of weighted evaluation criteria. For each criterion give:
- The criterion, worded so a supplier knows what to address.
- Its weighting, and one sentence justifying that weighting against what good
  looks like above.
- What evidence a response would need to score well.
- What would make a response score poorly.

Keep the set to five criteria or fewer. Separate price from the rest and say
how you would treat it.

Then challenge your own draft: which criterion is most likely to produce a
tie between good bidders, and how would you sharpen it?`,
    notes:
      'The five criteria cap is deliberate. Long criteria sets spread weight so thin that nothing discriminates between bidders.',
  },
  {
    mainTopic: 'award',
    useCase: 'Evaluation criteria',
    useCaseOrder: 30,
    tool: 'chatgpt',
    title: 'Build a scoring rubric from criteria',
    order: 20,
    body: `Turn the evaluation criteria below into a scoring rubric an evaluation panel
can apply consistently.

"""
{{PASTE YOUR EVALUATION CRITERIA}}
"""

For each criterion, define a 0 to 5 scale. For every point on the scale,
describe what a response at that level actually contains. Be concrete: an
evaluator should be able to read a response and land on the same score as a
colleague without discussing it first.

Then give me:
- The two adjacent scores most likely to be confused, and a sentence that
  separates them.
- Three moderation questions for the panel chair to ask when scores diverge.`,
    notes:
      'Aimed at scoring consistency. The point of a rubric is that two evaluators reach the same number independently.',
  },
  {
    mainTopic: 'award',
    useCase: 'Probity and process',
    useCaseOrder: 40,
    tool: 'claude',
    title: 'Probity check on a draft process',
    order: 10,
    body: `Act as a probity adviser reviewing a procurement process before it starts.

The process as planned:
"""
{{DESCRIBE THE PROCESS: STAGES, WHO IS INVOLVED, HOW SUPPLIERS ARE ENGAGED}}
"""

Known relationships or history: {{INCUMBENTS, PRIOR ENGAGEMENTS, ANY CONNECTIONS}}

Identify:
1. Points where a supplier could gain an unfair advantage, intended or not.
2. Points where the process could be perceived as unfair even if it is not,
   and why the perception would arise.
3. Any conflict of interest this process does not yet handle.
4. What should be recorded contemporaneously, and at which step, so a decision
   can be defended later.

For each point, say what you would change. Distinguish clearly between what is
a probity problem and what is simply a practice you would improve.`,
    notes: `The distinction in the last line matters: treating every improvement as a probity failure makes the real ones easier to dismiss. ${VERIFY}`,
  },
  {
    mainTopic: 'award',
    useCase: 'Managing the contract',
    useCaseOrder: 50,
    tool: 'gemini',
    title: 'Outline a contract management plan',
    order: 10,
    body: `Draft a contract management plan outline.

Contract: {{WHAT WAS BOUGHT}}
Term: {{LENGTH AND ANY EXTENSION OPTIONS}}
Value: {{VALUE}}
What success looks like: {{THE OUTCOME THE CONTRACT EXISTS TO DELIVER}}
Known risks carried into the contract: {{RISKS}}

Cover:
- Who does what, on our side and theirs, including who can approve a variation.
- The performance measures worth tracking, and how often each is reviewed.
- The meetings that should exist, their purpose, and who attends. Justify each
  one or leave it out.
- Decision points where an extension, a renegotiation or an exit must be
  considered, and how far in advance each has to be started.
- What would tell us early that this contract is going wrong.

Keep it to what a contract manager would actually use. If a section would be
filled in once and never read again, say so instead of including it.`,
    notes:
      'The last instruction is doing real work. Contract management plans fail by being too long to use rather than too short.',
  },

  // ===================== WIN CONTRACTS (bidding) =====================
  {
    mainTopic: 'win',
    useCase: 'Reading the tender',
    useCaseOrder: 10,
    tool: 'claude',
    title: 'Extract every mandatory requirement',
    order: 10,
    body: `Read the tender document below and extract every requirement we must meet.

"""
{{PASTE THE TENDER DOCUMENT}}
"""

Return a table with: requirement, the exact clause or section it comes from,
whether it is mandatory or evaluated, what evidence would satisfy it, and where
in our response it belongs.

Rules:
- Quote the source wording. Do not paraphrase a requirement into something
  softer than it says.
- Include requirements buried in the conditions of participation, the draft
  contract and the attachments, not only the response schedules.
- Flag separately anything that looks like a requirement but has no stated
  consequence for missing it.
- If a requirement is unclear, list it under "questions for the buyer" rather
  than guessing what it means.

Do not summarise the tender. I want the requirements.`,
    notes:
      'Long documents are the case for using an assistant here. Check the extraction against the source before you rely on it, especially the mandatory / evaluated split.',
  },
  {
    mainTopic: 'win',
    useCase: 'Reading the tender',
    useCaseOrder: 10,
    tool: 'claude',
    title: 'Find what the buyer is really worried about',
    order: 20,
    body: `Read the tender below as an experienced bid strategist.

"""
{{PASTE THE TENDER DOCUMENT OR THE KEY SECTIONS}}
"""

I am not asking for a summary. Tell me:
1. What problem is this buyer actually trying to solve, as opposed to what they
   have asked to buy?
2. What has probably gone wrong for them before? Point to the wording that
   suggests it: unusual clauses, oddly specific requirements, heavy reporting.
3. Where is the real weight in the evaluation, judging by what they ask about
   at length rather than by the stated weightings alone?
4. What would a safe, unimaginative response look like here, so I know what
   everyone else will send?

Quote the wording behind each conclusion. Where you are inferring, say you are
inferring.`,
    notes:
      'The last instruction keeps the output honest. Inference presented as fact is the failure mode of this kind of prompt.',
  },
  {
    mainTopic: 'win',
    useCase: 'Bid or no bid',
    useCaseOrder: 20,
    tool: 'chatgpt',
    title: 'Work through a bid or no bid decision',
    order: 10,
    body: `Help me decide whether to bid. Be a sceptic, not a cheerleader.

Opportunity: {{WHAT IT IS}}
Value and term: {{VALUE AND LENGTH}}
Buyer: {{WHO}}
Incumbent: {{WHO, AND HOW LONG THEY HAVE HELD IT}}
Our relevant past performance: {{WHAT WE HAVE ACTUALLY DELIVERED}}
Our gaps: {{WHERE WE ARE WEAK AGAINST THIS}}
Bid cost estimate: {{PEOPLE AND DAYS}}
Deadline: {{WHEN}}

Work through:
1. Can we comply with every mandatory requirement today? Name any we cannot.
2. What is our honest win probability, and what is that based on?
3. What would have to be true for us to beat the incumbent?
4. What is the cost of bidding, including the work we would not do instead?
5. What is the cost of winning badly, if the price or the terms are wrong?

Finish with a recommendation: bid, no bid, or bid only if a named condition is
met. Argue the opposite case in three sentences before you conclude.`,
    notes:
      'The instruction to argue the opposite case is the point. An assistant asked to help you bid will help you bid.',
  },
  {
    mainTopic: 'win',
    useCase: 'Planning the response',
    useCaseOrder: 30,
    tool: 'chatgpt',
    title: 'Storyboard the response before writing it',
    order: 10,
    body: `Help me plan a tender response before I write a word of it.

The question or criterion: {{PASTE THE QUESTION AND ITS WEIGHTING}}
Word or page limit: {{LIMIT}}
What we want the evaluator to conclude: {{YOUR KEY MESSAGE}}
Evidence available: {{PROJECTS, RESULTS, PEOPLE, ACCREDITATIONS}}

Produce a storyboard:
- The single claim this answer makes, in one sentence.
- Three or four supporting points, each with the specific evidence that proves
  it and roughly how many words it deserves.
- What to put in the first two sentences, given that an evaluator reading forty
  responses decides early whether this one is any good.
- Anything in my evidence list that does not earn its place here.

Do not write the response. If the evidence does not support the claim, say
which claim the evidence would support instead.`,
    notes:
      'Deliberately stops short of drafting. A storyboard you disagree with is cheap to fix; a draft built on the wrong claim is not.',
  },
  {
    mainTopic: 'win',
    useCase: 'Writing the response',
    useCaseOrder: 40,
    tool: 'claude',
    title: 'Turn capability notes into an evidence led answer',
    order: 10,
    body: `Turn my rough notes into a tender response answer.

The question: {{PASTE THE QUESTION}}
Word limit: {{LIMIT}}
My notes:
"""
{{PASTE YOUR NOTES, HOWEVER ROUGH}}
"""

Write the answer so that:
- Every claim is followed by the evidence for it. If a claim in my notes has no
  evidence behind it, leave the claim out and tell me at the end what you
  dropped and why.
- It answers the question that was asked, in the order it was asked.
- It uses our own words, not tender boilerplate. No "world class", no "leading
  provider", no "leverage", no "synergies".
- It stays inside the word limit. Count the words and tell me the total.

After the answer, list every place where a specific number, name or date would
strengthen it and I have not given you one.`,
    notes:
      'The banned words list is worth extending to whatever your own drafts overuse. The final list is a to do list for the bid team.',
  },
  {
    mainTopic: 'win',
    useCase: 'Writing the response',
    useCaseOrder: 40,
    tool: 'chatgpt',
    title: 'Cut an over length answer without losing the substance',
    order: 20,
    body: `This answer is over its limit. Cut it down.

Limit: {{LIMIT}}
Current length: {{CURRENT COUNT}}
The answer:
"""
{{PASTE THE ANSWER}}
"""

Cut in this order, and show me what you removed at each stage:
1. Words that carry no meaning: qualifiers, throat clearing, restating the
   question back at the evaluator.
2. Claims with no evidence behind them.
3. Repetition, including anything already said in a different section.
4. Only then, the weakest evidenced point.

Do not cut a specific number, client name, date or measurable result to make
room for prose. Those are the parts being scored.

Give me the final version with its word count, then a short list of what went
and why, so I can put something back if you cut the wrong thing.`,
    notes:
      'The ordering is the useful part. Left to itself an assistant cuts evidence first, because evidence is what takes the most words.',
  },
  {
    mainTopic: 'win',
    useCase: 'Past performance and referees',
    useCaseOrder: 50,
    tool: 'gemini',
    title: 'Write a past performance case study',
    order: 10,
    body: `Write a past performance case study for a tender response.

Client: {{WHO, OR "a state government agency" IF IT CANNOT BE NAMED}}
What we delivered: {{WHAT}}
When and for how long: {{DATES}}
Value: {{VALUE}}
The problem they had: {{THE SITUATION BEFORE WE STARTED}}
What we did: {{YOUR ACCOUNT}}
The result, with numbers: {{MEASURABLE OUTCOMES}}
What went wrong and how we handled it: {{BE HONEST, THIS IS FOR MY EYES}}

Structure it as situation, task, action, result, in no more than
{{WORD LIMIT}} words.

Rules:
- Lead with the result. Evaluators read the first line of each case study and
  skim the rest.
- Every claim quantified where I have given you a number. Where I have not,
  mark it {{NEEDS A NUMBER}} rather than writing a vague claim.
- Do not invent figures, dates, client names or outcomes. If something is
  missing, say so.

Separately, tell me whether the thing that went wrong is worth including, and
if so how to write it so it reads as competence rather than as a warning.`,
    notes:
      'The "do not invent figures" rule is not optional. A fabricated number in a past performance claim is a serious problem, not a drafting error.',
  },

  // ===================== OTHER =====================
  {
    mainTopic: 'other',
    useCase: 'Research',
    useCaseOrder: 10,
    tool: 'gemini',
    title: 'Compare how two jurisdictions handle the same thing',
    order: 10,
    body: `Compare how these jurisdictions treat the same procurement question.

Jurisdictions: {{e.g. NSW and Commonwealth}}
The question: {{e.g. when a limited tender is permitted}}

Give me a table with a row per jurisdiction covering: the rule as you
understand it, the instrument it sits in, and any threshold or trigger.

Then, below the table:
- Where the two genuinely differ, as opposed to using different words for the
  same thing.
- What each answer depends on, so I know when it stops applying.
- Which parts you are least confident about, and exactly what document I should
  read to confirm each one.

Do not present a figure or threshold as current unless you can name the
instrument it comes from. Where you cannot, say so.`,
    notes: `Use this to find out what to read, not as the answer. ${VERIFY}`,
  },
  {
    mainTopic: 'other',
    useCase: 'Summarising',
    useCaseOrder: 20,
    tool: 'claude',
    title: 'Summarise a policy for a decision maker',
    order: 10,
    body: `Summarise the document below for someone who has to make a decision on it
and has ten minutes.

"""
{{PASTE THE DOCUMENT}}
"""

Give me:
1. What it requires, in five bullets or fewer.
2. What changes for us specifically, as opposed to what is simply restated.
3. Any date, threshold or obligation with a deadline attached.
4. What it does not say that a reader might assume it does.
5. The one question I should ask before acting on it.

Quote the document for anything in points 1 and 3. If the document is unclear
on something important, say it is unclear rather than resolving it for me.`,
    notes:
      'Point 4 is the one worth reading. Most misreadings of a policy are assumptions about what it covers, not misunderstandings of what it says.',
  },
  {
    mainTopic: 'other',
    useCase: 'Reviewing your own writing',
    useCaseOrder: 30,
    tool: 'chatgpt',
    title: 'Rewrite it in plain English',
    order: 10,
    body: `Rewrite the text below in plain English for a reader outside our organisation.

"""
{{PASTE THE TEXT}}
"""

Rules:
- Keep every fact, obligation and qualification. Plain does not mean vaguer.
- Expand every acronym on first use.
- Replace jargon only where a plain word means the same thing. Where a term is
  a defined term and has to stay, keep it and explain it once.
- Shorter sentences, active voice, no more than one idea per sentence.

Give me the rewrite, then a short list of anything you could not simplify
without changing the meaning, and why.`,
    notes:
      'The last list is the safeguard. Simplification that quietly drops a qualification is worse than the original.',
  },
];

async function run() {
  await connectDB();

  let created = 0;
  let updated = 0;

  for (const prompt of PROMPTS) {
    const existing = await Prompt.findOne({
      mainTopic: prompt.mainTopic,
      title: prompt.title,
    });

    if (existing) {
      // `status` is not in the payload, so a prompt already reviewed and
      // published stays published when this is re-run.
      Object.assign(existing, prompt);
      await existing.save();
      updated += 1;
      console.log(`[seed-prompts] updated ${prompt.mainTopic} "${prompt.title}"`);
    } else {
      await Prompt.create({ ...prompt, status: 'draft' });
      created += 1;
      console.log(`[seed-prompts] created ${prompt.mainTopic} "${prompt.title}" (draft)`);
    }
  }

  console.log(
    `[seed-prompts] done. ${created} created, ${updated} updated, ${PROMPTS.length} in the set.`,
  );
  console.log(
    '[seed-prompts] All new prompts are DRAFTS. They have been written but not run ' +
      'against their tools. Read each one, try it, edit it, then publish.',
  );

  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed-prompts] failed:', err);
  process.exit(1);
});
