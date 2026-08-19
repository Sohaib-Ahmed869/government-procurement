import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// B4 — one master prompt in the AI Prompt Library.
//
// The library is three levels deep: Main Topic → Use Case → AI Tool. Only the
// first and last are fixed sets; the middle one is free text on purpose.
//
// The two segments the whole site is built on, plus 'other' for the prompts
// that serve neither side specifically — research, summarising, writing a brief.
export const PROMPT_TOPICS = ['award', 'win', 'other'];

// Fixed by the brief. Not an open list: a prompt is written and tested against
// one assistant's behaviour, and offering a fourth we have not checked would be
// a claim we cannot stand behind.
export const PROMPT_TOOLS = ['chatgpt', 'claude', 'gemini'];

const promptSchema = new mongoose.Schema(
  {
    mainTopic: { type: String, enum: PROMPT_TOPICS, required: true, index: true },
    // The middle level — "Writing evaluation criteria", "Drafting a capability
    // statement". Free text rather than an enum because nobody can enumerate
    // the use cases up front, and a new one should not need a deploy. The admin
    // screen offers the ones already in use as a datalist, so the common case is
    // a click and only a genuinely new use case gets typed.
    useCase: { type: String, required: true, trim: true, index: true },
    // Where the use case sits within its topic. Stored per prompt because a use
    // case is not a record of its own; where prompts under one disagree the
    // LOWEST wins, so a single prompt left at the default cannot drag a whole
    // group to the top.
    useCaseOrder: { type: Number, default: 0 },
    tool: { type: String, enum: PROMPT_TOOLS, required: true, index: true },
    title: { type: String, required: true, trim: true },
    // The prompt itself — what the copy button puts on the clipboard. Not
    // trimmed of its internal shape: prompts carry deliberate line breaks and
    // placeholder markers, and collapsing them would break the thing being
    // copied.
    body: { type: String, required: true },
    // Optional guidance printed under the prompt — what to swap in, what to
    // expect back. Never copied; the clipboard gets `body` alone, so a visitor
    // cannot accidentally paste our commentary into the tool.
    notes: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.PUBLISHED, index: true },
  },
  { timestamps: true },
);

// The order the page groups and prints in, so the list arrives ready to render.
promptSchema.index({ mainTopic: 1, useCaseOrder: 1, useCase: 1, order: 1, title: 1 });

export const Prompt = mongoose.model('Prompt', promptSchema);
