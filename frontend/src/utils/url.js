// Client-entered URLs (instance link, tracker link) are often pasted without
// a protocol (e.g. "client.digiicampus.com"), which browsers then treat as a
// relative link instead of an external site. Prepend https:// unless a
// protocol is already present.
export function normalizeUrl(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return trimmed
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
