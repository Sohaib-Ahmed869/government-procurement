// B4 — the AI Prompt Library's fixed vocabulary.
//
// Two of the library's three levels are fixed sets and live here; the middle
// one, Use Case, is free text on the model and is derived from whatever the CMS
// actually holds (see PromptsBrowser). That is the whole point of the split: the
// topics and the tools are decisions, the use cases are content.

// Main Topic — the two site segments plus a bucket for prompts that serve
// neither side specifically. Kept in step with PROMPT_TOPICS in
// be/src/models/Prompt.js, which is what the API validates against.
export const TOPICS = [
  // No blurb on these. Each carried a line printed under the topic heading in
  // the results, restating the topic to a visitor who had just chosen it.
  { value: 'award', label: 'Award Contracts' },
  { value: 'win', label: 'Win Contracts' },
  { value: 'other', label: 'Other' },
];

export const TOPIC_BY_VALUE = Object.fromEntries(TOPICS.map((t) => [t.value, t]));

// The three assistants the brief limits the library to. A prompt is written and
// tested against one assistant's behaviour, so this is a closed set rather than
// a free field — offering a fourth we have not checked would be a claim we
// cannot stand behind.
export const TOOLS = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
];

export const TOOL_BY_VALUE = Object.fromEntries(TOOLS.map((t) => [t.value, t]));

// Options for the CMS selects, and for the sidebar once "All" is prepended.
export const TOPIC_OPTIONS = TOPICS.map(({ value, label }) => ({ value, label }));
export const TOOL_OPTIONS = TOOLS.map(({ value, label }) => ({ value, label }));
