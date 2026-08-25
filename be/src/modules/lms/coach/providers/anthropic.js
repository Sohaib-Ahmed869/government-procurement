import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../../config/env.js';

/* ---------------------------------------------------------------------------
   The Anthropic adapter for the Course Coach (LMS 18.0).

   THIS IS THE ONLY FILE IN THE CODEBASE THAT IMPORTS AN AI VENDOR'S SDK.

   Everything else — the controller, the gate, the context assembly, the
   screens — talks to the interface at the bottom of this file and has never
   heard of Anthropic, Claude, or any other provider. Swapping vendors means
   writing a sibling of this file and changing COACH_PROVIDER; it does not mean
   touching the feature.

   The interface, in full:

     name        what this provider is called, for COACH_PROVIDER
     configured  whether it has credentials to run with
     ask()       one question, answered from the supplied documents

   ---- Why citations are not optional here -----------------------------------

   Every lesson goes in as its own `document` block with citations enabled, so
   each sentence of the answer comes back tied to the lesson it came from, with
   the source text and its character offsets. That is what lets the screen show
   "— Module 2 · Writing the evaluation plan" under an answer and link to it.

   It is also the honest answer to "can this be trusted": the learner checks the
   lesson rather than the model. The Procurement Advisor (A6) makes the same
   promise a different way — every item it emits carries a `basis` — and the
   coach should not be the vaguer sibling of it.
   ------------------------------------------------------------------------ */

// Enough for a thorough answer with room for citations; nowhere near enough to
// let a runaway response cost real money. Non-streaming, so this also has to
// stay under the SDK's HTTP timeout.
const MAX_TOKENS = 4096;

let client = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: env.coach.apiKey });
  return client;
}

/* One lesson, as a citable document.

   `context` is metadata the model can read but cannot cite, which is exactly
   where the lesson's position in the course belongs: useful for "that comes
   after the evaluation module", never something to quote back at a learner. */
const toDocument = (doc) => ({
  type: 'document',
  source: { type: 'text', media_type: 'text/plain', data: doc.text },
  title: doc.title,
  context: doc.context,
  citations: { enabled: true },
});

/* The response arrives as a run of text blocks, where the cited ones carry a
   `citations` array. Flattened here into one string plus a de-duplicated list,
   because the screen renders prose with sources underneath rather than
   interleaved footnotes.

   Citations are keyed by document title. Two sentences citing the same lesson
   are one source, not two. */
function flatten(content, documents) {
  let text = '';
  const sources = new Map();

  for (const block of content) {
    if (block.type !== 'text') continue;
    text += block.text;

    for (const cite of block.citations ?? []) {
      const doc = documents[cite.document_index];
      if (!doc) continue;
      if (!sources.has(doc.title)) {
        sources.set(doc.title, {
          title: doc.title,
          lessonId: doc.lessonId,
          moduleTitle: doc.moduleTitle,
          // The first passage cited from this lesson, so the learner can see
          // WHY it was cited without opening it.
          quote: cite.cited_text,
        });
      }
    }
  }

  return { text: text.trim(), sources: [...sources.values()] };
}

export const anthropicProvider = {
  name: 'anthropic',

  get configured() {
    return Boolean(env.coach.apiKey);
  },

  /* `documents` are the course's lessons; `history` is the conversation so far
     as [{ role, text }]. The system prompt is the caller's — this file decides
     nothing about what the coach will and will not answer, which keeps that
     rule in one readable place (see ../prompt.js). */
  async ask({ system, documents, history = [], question }) {
    const docs = documents.map(toDocument);

    const response = await getClient().messages.create({
      model: env.coach.model,
      max_tokens: MAX_TOKENS,
      output_config: { effort: env.coach.effort },

      /* The system prompt is the stable prefix and is marked for caching.

         The course itself sits in the first user message rather than in
         `system`, because document blocks belong in message content — but the
         cache breakpoint below still covers everything before the question, so
         a second question about the same course re-reads the cached prefix
         instead of paying to re-send the whole course. Check it is working by
         watching `usage.cache_read_input_tokens`; a persistent zero means
         something in the prefix is varying per request. */
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],

      messages: [
        {
          role: 'user',
          content: [
            ...docs,
            // Marked on the LAST document, so the course content is the cached
            // prefix and the question after it is the only volatile part.
            { type: 'text', text: 'The lessons above are the course material.', cache_control: { type: 'ephemeral' } },
          ],
        },
        { role: 'assistant', content: 'Understood. I will answer only from those lessons.' },
        ...history.map((turn) => ({ role: turn.role, content: turn.text })),
        { role: 'user', content: question },
      ],
    });

    /* A refusal is a real outcome, not an error: safety classifiers can decline
       a request and the call still returns 200 with no usable content. Checked
       before reading `content`, which would otherwise be empty and read to the
       learner as the coach having nothing to say. */
    if (response.stop_reason === 'refusal') {
      return {
        text: '',
        sources: [],
        refused: true,
        usage: response.usage,
      };
    }

    const { text, sources } = flatten(response.content, documents);

    return {
      text,
      sources,
      refused: false,
      // Surfaced so cost and cache behaviour are observable from the caller
      // rather than needing a vendor dashboard.
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        cacheReadTokens: response.usage?.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage?.cache_creation_input_tokens ?? 0,
      },
    };
  },
};
