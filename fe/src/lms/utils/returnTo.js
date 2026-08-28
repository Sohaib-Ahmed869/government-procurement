/* Where to send someone after they sign in or sign up.

   Read from `?next=` first and router state second. The query string is what
   survives a page reload; the state is richer when it is there. Both are
   client-supplied, so both are validated the same way.

   A destination is only accepted if it is a single-slash relative path. The
   case that matters is `//evil.com`, which is a protocol-relative URL and not a
   path at all — used unchecked it would send a signed-in learner off-site. */
export function safeNext(value) {
  if (typeof value !== 'string') return '';
  if (!value.startsWith('/') || value.startsWith('//')) return '';
  return value;
}

export function returnToFrom({ search, state }) {
  const fromQuery = safeNext(new URLSearchParams(search ?? '').get('next') ?? '');
  if (fromQuery) return fromQuery;

  const loc = state?.from;
  if (!loc?.pathname) return '';
  return safeNext(`${loc.pathname}${loc.search ?? ''}${loc.hash ?? ''}`);
}
