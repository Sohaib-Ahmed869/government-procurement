// A minimal OOXML writer, used only by seed-templates.js.
//
// An .docx / .xlsx / .pptx is a ZIP of XML parts. There is no zip library in
// this project's dependencies and adding one to seed a handful of preview files
// would be the tail wagging the dog, so this writes the container directly.
//
// Every entry is STORED (compression method 0). Uncompressed entries make the
// format trivial to emit correctly: no deflate stream, no compressed sizes to
// reconcile, and the CRC is the only computed field. The files are a few
// kilobytes, so nothing is gained by compressing them.

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ZIP stores time as DOS date/time. Fixed rather than "now" so the same input
// always produces byte-identical output, which makes the files diffable and the
// seed repeatable.
const DOS_TIME = 0; // 00:00:00
const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1; // 2020-01-01

/**
 * Builds a ZIP from `files`: an array of { name, data } where data is a string
 * or Buffer. Returns a Buffer.
 */
export function zip(files) {
  const entries = files.map(({ name, data }) => ({
    name: Buffer.from(name, 'utf8'),
    data: Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'),
  }));

  const chunks = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const crc = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method: stored
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18); // compressed size
    local.writeUInt32LE(entry.data.length, 22); // uncompressed size
    local.writeUInt16LE(entry.name.length, 26);
    local.writeUInt16LE(0, 28); // extra length

    chunks.push(local, entry.name, entry.data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); // central directory signature
    dir.writeUInt16LE(20, 4); // version made by
    dir.writeUInt16LE(20, 6); // version needed
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(DOS_TIME, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(entry.data.length, 20);
    dir.writeUInt32LE(entry.data.length, 24);
    dir.writeUInt16LE(entry.name.length, 28);
    dir.writeUInt16LE(0, 30); // extra
    dir.writeUInt16LE(0, 32); // comment
    dir.writeUInt16LE(0, 34); // disk number
    dir.writeUInt16LE(0, 36); // internal attrs
    dir.writeUInt32LE(0, 38); // external attrs
    dir.writeUInt32LE(offset, 42); // offset of local header

    central.push(dir, entry.name);
    offset += local.length + entry.name.length + entry.data.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuf, end]);
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_DOC_REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument';

/** A Word document: a title and a run of paragraphs. */
export function docx({ title, paragraphs }) {
  const body = [title, ...paragraphs]
    .map((text, i) => {
      const style = i === 0 ? '<w:pPr><w:pStyle w:val="Title"/></w:pPr>' : '';
      return `<w:p>${style}<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
    })
    .join('');

  return zip([
    {
      name: '[Content_Types].xml',
      data:
        `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      data: `${XML}<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${OFFICE_DOC_REL}" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: 'word/document.xml',
      data:
        `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body>${body}<w:sectPr/></w:body></w:document>`,
    },
  ]);
}

/** A single-sheet workbook. `rows` is an array of arrays of strings. */
export function xlsx({ rows }) {
  // Inline strings rather than a shared-strings table: one less part to keep
  // consistent, and Excel reads them without complaint.
  const sheetRows = rows
    .map((cells, r) => {
      const tds = cells
        .map((value, c) => {
          const ref = `${String.fromCharCode(65 + c)}${r + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${tds}</row>`;
    })
    .join('');

  return zip([
    {
      name: '[Content_Types].xml',
      data:
        `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      data: `${XML}<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${OFFICE_DOC_REL}" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data:
        `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${
          'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
        }"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data:
        `${XML}<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${
          'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'
        }" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data:
        `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ]);
}
