import { useCallback, useEffect, useId, useRef, useState } from 'react';
import LmsIcon from './LmsIcon.jsx';

/* A dropdown that is ours all the way down.

   `.lms-select` styled a native <select> and got most of the way: the closed
   control took the border, the corner and the chevron. What it could never take
   was the OPEN list. A browser draws that popup itself, outside the page, and
   the row under the cursor is painted by the platform — which is why a menu of
   green options highlighted grey. `option:hover` is honoured by Firefox and
   ignored by Chromium, so there is no CSS answer; the list has to be ours.

   So this is a button and a <ul>, both in the document, both styleable. What
   that costs is every keyboard and screen-reader behaviour a native select had
   for free, and each one is put back deliberately below:

     · role="listbox" / role="option" with aria-selected, so it is announced as
       a list of choices and not as a menu of links;
     · aria-activedescendant rather than moving focus into the list, so the
       button keeps focus and the reader still announces the highlighted row;
     · Up/Down to move, Home/End to jump, Enter or Space to take, Escape to
       abandon and Tab to leave — all of which a native select does;
     · typing a letter jumps to the next option starting with it;
     · opening on a closed control highlights the CURRENT value rather than the
       first row, so Down from a mid-list value moves one step, not to the top.

   `options` is `[{ value, label }]`. `value` is the selected value, `onChange`
   is called with the new one — the same contract the native element had, so a
   caller swaps one for the other without touching its state. */
export default function Select({
  value,
  onChange,
  options = [],
  id,
  className = '',
  placeholder = 'Select…',
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  // The row the keyboard is on, which is NOT the selection until it is taken.
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const typed = useRef({ text: '', at: 0 });
  const reactId = useId();
  const baseId = id || `sel-${reactId}`;

  const selected = options.findIndex((o) => o.value === value);
  const label = selected >= 0 ? options[selected].label : placeholder;

  const close = useCallback((refocus) => {
    setOpen(false);
    setActive(-1);
    if (refocus) rootRef.current?.querySelector('button')?.focus();
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setActive(selected >= 0 ? selected : 0);
  }, [disabled, selected]);

  const take = useCallback(
    (i) => {
      const opt = options[i];
      if (!opt) return close(true);
      if (opt.value !== value) onChange?.(opt.value);
      return close(true);
    },
    [close, onChange, options, value],
  );

  /* Pointer down outside, a resize, or a scroll of the page all close it.

     The scroll case is the one that matters. The list is positioned against the
     control, so it travels with it — and the control travels under the sticky
     header, which put an open list on top of the search field and the bell. It
     closes instead, which is what a menu anchored to something scrollable
     should do; the z-index below is only there so the frame before it closes
     cannot paint over the bar either.

     Capture phase, and scrolls that came from INSIDE the list are ignored: the
     list is its own scroll container past nine or ten options, and a wheel over
     it must move the options rather than dismiss them. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) close(false);
    };
    const onScroll = (e) => {
      if (listRef.current?.contains(e.target)) return;
      close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  /* Keep the highlighted row in view when the list is longer than its box.

     By moving the list's OWN scrollTop, not by calling scrollIntoView. That
     helper walks up the tree and scrolls whatever ancestor it has to, including
     the page — which fired the scroll handler above and closed the list the
     instant the pointer entered a row. Setting scrollTop here scrolls one
     element, and its scroll event comes FROM the list, so the handler ignores
     it by design. */
  useEffect(() => {
    if (!open || active < 0) return;
    const list = listRef.current;
    const row = list?.children[active];
    if (!list || !row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [open, active]);

  function onKeyDown(e) {
    if (disabled) return;

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close(true);
        break;
      case 'Tab':
        // Not preventDefault: Tab should leave the control, as it does on a
        // native select, rather than being swallowed by the open list.
        close(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        take(active);
        break;
      default: {
        // Type-ahead. Keystrokes within a second build one string, so "pr"
        // finds "Most progress" rather than jumping to P then R.
        if (e.key.length !== 1 || e.altKey || e.ctrlKey || e.metaKey) return;
        const now = Date.now();
        typed.current.text = now - typed.current.at > 1000 ? e.key : typed.current.text + e.key;
        typed.current.at = now;
        const q = typed.current.text.toLowerCase();
        const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(q));
        if (hit >= 0) setActive(hit);
      }
    }
  }

  return (
    <div className={`lms-sel${open ? ' is-open' : ''} ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        id={baseId}
        className="lms-sel__button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-activedescendant={open && active >= 0 ? `${baseId}-o${active}` : undefined}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="lms-sel__value">{label}</span>
        <LmsIcon name="chevron" className="lms-sel__chevron" />
      </button>

      {open ? (
        <ul className="lms-sel__list" role="listbox" ref={listRef} aria-labelledby={baseId}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${baseId}-o${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`lms-sel__option${i === active ? ' is-active' : ''}${
                o.value === value ? ' is-selected' : ''
              }`}
              /* mousedown, not click: the document-level mousedown listener
                 above closes the list, and on click alone that fires first and
                 the selection never lands. */
              onMouseDown={(e) => {
                e.preventDefault();
                take(i);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
