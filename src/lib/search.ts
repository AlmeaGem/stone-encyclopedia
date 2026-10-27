export function normalize(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・･\-‐]/g, '');
}
export function matches(query: string, terms: string) {
  return normalize(query)
    .split(/[、,]+/)
    .filter(Boolean)
    .every((q) => normalize(terms).includes(q));
}
