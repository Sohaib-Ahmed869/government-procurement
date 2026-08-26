/* Un-hard-wrapping a prompt.

   Prompts arrive from the CMS with the line breaks whoever wrote them typed,
   and most were written in an editor that wraps at a fixed column. The page
   renders them `white-space: pre-wrap`, which honours every one of those
   breaks — so in a box the width of the page a sentence stopped halfway across
   and continued on the next line, leaving the right half of the box empty and
   the prompt looking like verse.

   The breaks that matter are still kept. A blank line is a paragraph. A list
   item, a numbered step, a heading, a placeholder on a line of its own and
   anything introduced by a colon all stay where they are. What is joined is the
   one kind of break that carries no meaning: a line that ran out of room.

   HOW A "RAN OUT OF ROOM" BREAK IS TOLD APART.
   By length, which is the only signal actually present in the text. Text
   wrapped at a column produces a run of lines all close to that column's width;
   a line that ENDS a paragraph is short, because it stopped when the sentence
   did. So the longest line in a block is taken as the wrap column, and any line
   within ~12% of it is treated as having been cut off rather than finished.

   Punctuation is deliberately NOT the test. A hard-wrapped paragraph breaks
   after a full stop as often as anywhere else, so joining only on "doesn't end
   in a full stop" leaves half the wraps in place.

   The result is used for BOTH what is shown and what is copied, which is the
   property that matters: the prompt on screen is the prompt on the clipboard.
   Un-wrapping is also the better text to paste — a model reads a paragraph the
   same either way, and the person pasting it into their own editor gets text
   that reflows to their width instead of somebody else's. */

// A line that begins a block of its own, and must keep the break before it.
const BLOCK_START =
  /^\s*(?:[-*•–—]\s|\d+[.)]\s|[a-z][.)]\s|#{1,6}\s|>\s|\[[^\]]*\]\s*$|\{\{)/i;

// A line that ends one — a colon introduces what follows, so the break after it
// is doing work.
const INTRODUCES = /[:;]\s*$/;

// Below this, a line is too short to have been produced by a wrap at all, so
// its break was the author's.
const MIN_WRAPPED = 40;

// How close to the longest line a line has to be to count as cut off.
const WRAP_TOLERANCE = 0.88;

export function unwrapPrompt(body) {
  const text = String(body ?? '');
  if (!text.trim()) return '';

  // Normalise line endings first, so a CRLF file is measured the same as an LF
  // one — otherwise every line is one character longer than it looks and the
  // wrap column comes out wrong.
  const paragraphs = text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/);

  return paragraphs
    .map((para) => {
      const lines = para.split('\n');
      if (lines.length < 2) return para.trim();

      // The wrap column, measured on this paragraph rather than the whole
      // prompt: a prompt can hold a wrapped paragraph and a short list, and one
      // column for both would judge the list's lines against the paragraph's.
      const longest = Math.max(...lines.map((l) => l.trimEnd().length));
      const threshold = Math.max(MIN_WRAPPED, longest * WRAP_TOLERANCE);

      let out = '';
      lines.forEach((raw, i) => {
        const line = raw.trim();
        if (i === 0) {
          out = line;
          return;
        }
        const prev = lines[i - 1].trimEnd();
        const joins =
          prev.length >= threshold && !INTRODUCES.test(prev) && !BLOCK_START.test(raw);
        out += joins ? ` ${line}` : `\n${line}`;
      });
      return out;
    })
    .join('\n\n')
    .trim();
}

// The opening of a prompt, for a card's teaser: enough to tell two apart at a
// glance without reprinting either. Taken from the unwrapped text, so it is the
// first sentence or two rather than the first 70 characters of a wrapped line.
export function promptTeaser(prompt, limit = 150) {
  if (prompt?.summary) return prompt.summary;
  const first = unwrapPrompt(prompt?.body)
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  if (!first) return '';
  return first.length > limit ? `${first.slice(0, limit).trimEnd()}…` : first;
}
