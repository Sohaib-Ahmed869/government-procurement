// Lesson bodies are stored as plain text (see the instructor's LessonEditor:
// "Plain text for now. It renders as paragraphs"). LessonBody renders
// structured blocks, so this is the bridge between the two.
//
// Deliberately NOT a markdown/HTML parser. Lesson content is authored by
// instructors and rendered into every enrolled learner's session, so turning it
// into markup here would be a stored-XSS route. Blank lines separate
// paragraphs; a line ending in a colon or wrapped in the list markers below
// becomes a list. Anything else is text, and stays text.
const BULLET = /^\s*[-*•]\s+/;

export function textToBlocks(body) {
  const text = String(body ?? '').trim();
  if (!text) return [];

  const blocks = [];
  let list = null;

  const flush = () => {
    if (list?.items.length) blocks.push(list);
    list = null;
  };

  for (const para of text.split(/\n\s*\n/)) {
    const lines = para.split('\n').map((l) => l.trimEnd()).filter(Boolean);
    if (!lines.length) continue;

    // A run of bullet lines is one list, however it was spaced.
    if (lines.every((l) => BULLET.test(l))) {
      if (!list) list = { type: 'ul', items: [] };
      list.items.push(...lines.map((l) => l.replace(BULLET, '')));
      continue;
    }
    flush();

    // A short line on its own, with no sentence-ending punctuation, is a
    // heading. It's a guess, but the alternative is one undifferentiated wall
    // of paragraphs, and an over-eager heading costs less than that.
    if (lines.length === 1 && lines[0].length <= 80 && !/[.!?,;]$/.test(lines[0])) {
      blocks.push({ type: 'h', text: lines[0] });
      continue;
    }

    blocks.push({ type: 'p', text: lines.join(' ') });
  }

  flush();
  return blocks;
}
