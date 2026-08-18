import LmsIcon from '../LmsIcon.jsx';

// Renders a text lesson (L1) from structured blocks rather than raw HTML.
//
// Blocks, not dangerouslySetInnerHTML, on purpose: lesson content is authored
// in the instructor tools (R1) and would otherwise be a stored-XSS route
// straight into every enrolled learner's session. If rich HTML becomes a
// requirement, it must be sanitised server-side on write, not trusted here.
export default function LessonBody({ blocks }) {
  return (
    <div className="lms-prose">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h':
            return <h2 key={i}>{block.text}</h2>;
          case 'ul':
            return (
              <ul key={i}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case 'callout':
            return (
              <aside key={i} className={`lms-callout is-${block.tone ?? 'note'}`}>
                <LmsIcon name={block.tone === 'warn' ? 'lock' : 'check'} />
                <div>
                  <strong>{block.title}</strong>
                  <p>{block.text}</p>
                </div>
              </aside>
            );
          default:
            return <p key={i}>{block.text}</p>;
        }
      })}
    </div>
  );
}
