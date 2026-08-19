// B6 — the Templates library's fixed vocabulary.
//
// Same shape as the Prompt Library's, and deliberately so: the two pages are
// the same browse, and a visitor who has learned one should not have to learn
// the other. Category and format are fixed sets; Use Case is free text and is
// derived from whatever the CMS holds.

// The two site segments plus a bucket for documents that serve neither
// specifically. Kept in step with TEMPLATE_CATEGORIES in
// be/src/models/Template.js, which is what the API validates against.
export const CATEGORIES = [
  {
    value: 'award',
    label: 'Award Contracts',
    blurb: 'Documents for running a procurement.',
  },
  {
    value: 'win',
    label: 'Win Contracts',
    blurb: 'Documents for responding to one.',
  },
  {
    value: 'other',
    label: 'Other',
    blurb: 'Documents useful on either side.',
  },
];

export const CATEGORY_BY_VALUE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

// The three formats the library hands out. No PDF: the brief is explicit that a
// download opens natively in Office, and a template you cannot edit is a
// picture of a template.
export const FORMATS = [
  { value: 'word', label: 'Word', ext: 'DOCX' },
  { value: 'excel', label: 'Excel', ext: 'XLSX' },
  { value: 'powerpoint', label: 'PowerPoint', ext: 'PPTX' },
];

export const FORMAT_BY_VALUE = Object.fromEntries(FORMATS.map((f) => [f.value, f]));

export const CATEGORY_OPTIONS = CATEGORIES.map(({ value, label }) => ({ value, label }));
export const FORMAT_OPTIONS = FORMATS.map(({ value, label }) => ({ value, label }));

// Bytes to something a person reads before deciding to download. Deliberately
// coarse: nobody needs three significant figures on a Word file.
export function fileSize(bytes) {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1000) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
