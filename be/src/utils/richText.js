import sanitizeHtml from 'sanitize-html';

/* ---------------------------------------------------------------------------
   Sanitising rich text on the way IN.

   Course descriptions, and the other long-form fields authored in a WYSIWYG,
   are rendered with dangerouslySetInnerHTML on the public site. That is fine
   for content only staff can write and NOT fine for a course body, because
   instructor accounts are open self-registration (see SELF_SIGNUP_ROLES): any
   visitor can create one, write `<img src=x onerror=…>` into a description and
   have it run in the session of everybody who opens the course page.

   Cleaned on write rather than on read, deliberately:
     · it happens once per save instead of once per view;
     · what is in the database is what will be rendered, so there is no second
       place where somebody can forget to call it;
     · the author sees the result of the cleaning immediately, rather than
       writing something that silently renders differently to everyone else.

   The allowlist matches what the editor's toolbar can actually produce
   (fe/src/admin/components/RichTextEditor.jsx). Anything else is not
   formatting somebody chose, it is something that arrived another way.
   ------------------------------------------------------------------------ */

const OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'blockquote',
    'a', 'img',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    // The editor writes an inline style on images it inserts. Kept because
    // dropping it would reflow every description already written, and narrowed
    // by allowedStyles below so it cannot carry anything else.
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      'max-width': [/^\d+(px|%)$/],
      'border-radius': [/^\d+px$/],
      margin: [/^[\d\s]+px$/],
      'text-align': [/^(left|right|center|justify)$/],
    },
  },
  // No javascript:, no data: URLs. data: on an <img> is how an SVG payload
  // gets in, and there is no reason to paste one into a course description.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  // A link out of the site opens in a new tab and must not hand the opener
  // over with it.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

export function sanitizeRichText(html) {
  if (typeof html !== 'string' || !html) return '';
  return sanitizeHtml(html, OPTIONS);
}

// Long-form fields that hold HTML and are rendered as HTML.
const RICH_TEXT_FIELDS = ['body'];

// Cleans the rich-text fields of a request body in place, leaving everything
// else untouched. Applied at the edge of each write rather than in a model
// hook: a hook would also run on internal updates that never came from a
// browser, and re-cleaning already-clean HTML on every save is work for
// nothing.
export function sanitizeRichTextFields(payload, fields = RICH_TEXT_FIELDS) {
  if (!payload || typeof payload !== 'object') return payload;
  fields.forEach((field) => {
    if (typeof payload[field] === 'string') {
      payload[field] = sanitizeRichText(payload[field]);
    }
  });
  return payload;
}
