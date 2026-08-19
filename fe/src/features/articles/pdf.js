// B1.7 — the download. A real file, written straight to disk.
//
// Built from the article's own DOM rather than screenshotted. The usual
// client-side route (html2canvas into jsPDF) rasterises the page: the text
// stops being text, it cannot be searched or copied, and a short article
// becomes a multi-megabyte image. This walks the prose instead and writes each
// heading, paragraph and list item as text, so the PDF is a few tens of
// kilobytes, selectable, and readable by a screen reader.
//
// jsPDF is imported dynamically, so nobody who never presses Download pays for
// it in the bundle.
const MARGIN = 18; // mm
const PAGE = { w: 210, h: 297 }; // A4 portrait
const CONTENT_W = PAGE.w - MARGIN * 2;

// A file name someone can find again: the slug, or the title reduced to one.
function fileName(article) {
  const base =
    article?.slug ||
    String(article?.title || 'article')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  return `${base || 'article'}.pdf`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Turn the rendered prose into a flat list of blocks. Reading the DOM rather
// than the stored HTML means what is written is exactly what was on screen,
// including anything the CMS body assembled at render time.
function readBlocks(root) {
  const blocks = [];
  if (!root) return blocks;

  const walk = (node) => {
    for (const el of node.children) {
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();

      if (tag === 'h1' || tag === 'h2') blocks.push({ type: 'h2', text });
      else if (tag === 'h3' || tag === 'h4') blocks.push({ type: 'h3', text });
      else if (tag === 'ul' || tag === 'ol') {
        [...el.children].forEach((li, i) => {
          const t = (li.textContent || '').replace(/\s+/g, ' ').trim();
          if (t) blocks.push({ type: 'li', text: t, marker: tag === 'ol' ? `${i + 1}.` : '•' });
        });
      } else if (tag === 'blockquote') blocks.push({ type: 'quote', text });
      else if (tag === 'img') blocks.push({ type: 'img', src: el.currentSrc || el.src });
      else if (tag === 'figure' || tag === 'div' || tag === 'section') {
        // A wrapper: recurse rather than flattening it into one long paragraph.
        const img = el.querySelector(':scope > img');
        if (img) blocks.push({ type: 'img', src: img.currentSrc || img.src });
        if (el.children.length) walk(el);
        else if (text) blocks.push({ type: 'p', text });
      } else if (text) blocks.push({ type: 'p', text });
    }
  };

  walk(root);
  return blocks;
}

// Images have to be data URLs for jsPDF. They are served from S3, so this goes
// through the network — a failure just drops that one image rather than the
// whole document.
async function toDataUrl(src) {
  try {
    const res = await fetch(src, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadArticlePdf(article) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = MARGIN;

  // Start a fresh page when the next block would run off this one.
  const room = (needed) => {
    if (y + needed <= PAGE.h - MARGIN) return;
    doc.addPage();
    y = MARGIN;
  };

  const write = (text, { size, style = 'normal', gapBefore = 0, gapAfter, indent = 0, colour = [26, 26, 26] }) => {
    y += gapBefore;
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
    const lines = doc.splitTextToSize(text, CONTENT_W - indent);
    const lineH = size * 0.3528 * 1.45; // pt to mm, times line height
    for (const line of lines) {
      room(lineH);
      doc.text(line, MARGIN + indent, y);
      y += lineH;
    }
    y += gapAfter ?? lineH * 0.45;
  };

  // --- title block ---
  write(article?.title || 'Article', { size: 20, style: 'bold', gapAfter: 3 });

  const meta = [formatDate(article?.publishedAt), article?.category?.name, article?.author?.name || article?.author]
    .filter(Boolean)
    .join('   ·   ');
  if (meta) write(meta, { size: 9, colour: [110, 110, 110], gapAfter: 5 });

  // A rule under the title, the paper equivalent of the bar on screen.
  room(2);
  doc.setDrawColor(210, 210, 210);
  doc.line(MARGIN, y, PAGE.w - MARGIN, y);
  y += 6;

  if (article?.overview) {
    write(article.overview, { size: 11.5, style: 'italic', colour: [70, 70, 70], gapAfter: 5 });
  }

  // --- the article itself ---
  const blocks = readBlocks(document.querySelector('.article-prose'));

  for (const block of blocks) {
    if (block.type === 'h2') write(block.text, { size: 14, style: 'bold', gapBefore: 4, gapAfter: 2 });
    else if (block.type === 'h3') write(block.text, { size: 12, style: 'bold', gapBefore: 3, gapAfter: 1.5 });
    else if (block.type === 'li') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const lineH = 11 * 0.3528 * 1.45;
      room(lineH);
      doc.setTextColor(26, 26, 26);
      doc.text(block.marker, MARGIN + 2, y);
      write(block.text, { size: 11, indent: 8, gapAfter: 1 });
    } else if (block.type === 'quote') {
      write(block.text, { size: 11, style: 'italic', indent: 6, colour: [70, 70, 70], gapBefore: 2, gapAfter: 3 });
    } else if (block.type === 'img') {
      const data = await toDataUrl(block.src);
      if (!data) continue;
      try {
        const props = doc.getImageProperties(data);
        const w = CONTENT_W;
        const h = (props.height / props.width) * w;
        room(h + 4);
        doc.addImage(data, MARGIN, y, w, h);
        y += h + 5;
      } catch {
        /* an image jsPDF cannot decode is skipped rather than failing the file */
      }
    } else {
      write(block.text, { size: 11, gapAfter: 3 });
    }
  }

  // --- footer on every page: where this came from ---
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(window.location.href, MARGIN, PAGE.h - 10, { maxWidth: CONTENT_W - 20 });
    doc.text(`${i} / ${pages}`, PAGE.w - MARGIN, PAGE.h - 10, { align: 'right' });
  }

  // Saved by hand rather than through doc.save(). jsPDF's own helper picks one
  // of several strategies depending on the browser, and the filename it ends up
  // with is not always the one asked for. A blob and an anchor is the one path
  // that is the same everywhere.
  const blob = doc.output('blob');
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName(article);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Freed on the next tick: revoking synchronously can cancel the download in
  // some browsers before it has read the blob.
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
