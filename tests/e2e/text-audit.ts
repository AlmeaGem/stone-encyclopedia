/** Runs in the browser. Evaluate actual inherited colors against composited surface/gradient stops. */
export function auditVisibleText() {
  type RGB = [number, number, number, number];
  const parse = (v: string): RGB => {
    const n = v.match(/[\d.]+/g)?.map(Number) || [];
    return [n[0] || 0, n[1] || 0, n[2] || 0, n.length > 3 ? n[3] : 1];
  };
  const over = (top: RGB, bottom: RGB): RGB => [
    top[0] * top[3] + bottom[0] * (1 - top[3]),
    top[1] * top[3] + bottom[1] * (1 - top[3]),
    top[2] * top[3] + bottom[2] * (1 - top[3]),
    1,
  ];
  const lum = (v: RGB) =>
    v
      .slice(0, 3)
      .map((n) => {
        n /= 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      })
      .reduce((a, n, i) => a + n * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a: RGB, b: RGB) => {
    const x = lum(a),
      y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const styles = new Map<Element, CSSStyleDeclaration>();
  const style = (el: Element) => {
    if (!styles.has(el)) styles.set(el, getComputedStyle(el));
    return styles.get(el)!;
  };
  const backgrounds = new Map<Element, RGB[]>();
  const surfaces = (el: Element): RGB[] => {
    if (backgrounds.has(el)) return backgrounds.get(el)!;
    const css = style(el);
    let candidates: RGB[] = el.parentElement
      ? surfaces(el.parentElement)
      : [[255, 255, 255, 1]];
    candidates = candidates.map((b) => over(parse(css.backgroundColor), b));
    const stops = css.backgroundImage.includes('gradient')
      ? css.backgroundImage.match(/rgba?\([^)]+\)/g) || []
      : [];
    if (stops.length)
      candidates = candidates.flatMap((b) =>
        stops.map((c) => over(parse(c), b)),
      );
    candidates = candidates.sort((a, b) => lum(a) - lum(b));
    if (candidates.length > 8)
      candidates = [...candidates.slice(0, 4), ...candidates.slice(-4)];
    backgrounds.set(el, candidates);
    return candidates;
  };
  const issues: Array<{
    text: string;
    ratio: number;
    minimum: number;
    foreground: string;
    background: RGB;
    selector: string;
  }> = [];
  let checked = 0,
    minimumRatio = Infinity;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode,
      el = node.parentElement,
      text = node.textContent?.trim() || '';
    if (
      !el ||
      !text ||
      el.closest(
        'script,style,option,[aria-hidden="true"],.sr-only,button:disabled,.choice:has(input:disabled)',
      )
    )
      continue;
    const box = el.getBoundingClientRect(),
      css = style(el);
    if (
      box.width < 2 ||
      box.height < 2 ||
      css.visibility === 'hidden' ||
      css.display === 'none'
    )
      continue;
    let opacity = 1;
    for (let p: Element | null = el; p; p = p.parentElement)
      opacity *= Number(style(p).opacity);
    if (opacity === 0) continue;
    const fg = parse(css.color);
    fg[3] *= opacity;
    const size = parseFloat(css.fontSize),
      weight = parseFloat(css.fontWeight),
      minimum = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
    const tests = surfaces(el)
        .map((bg) => ({ bg, value: ratio(over(fg, bg), bg) }))
        .sort((a, b) => a.value - b.value),
      worst = tests[0];
    minimumRatio = Math.min(minimumRatio, worst.value);
    checked++;
    if (worst.value + 0.005 < minimum)
      issues.push({
        text: text.slice(0, 95),
        ratio: Number(worst.value.toFixed(2)),
        minimum,
        foreground: css.color,
        background: worst.bg,
        selector: el.tagName.toLowerCase() + '.' + el.className,
      });
  }
  return { checked, minimumRatio: Number(minimumRatio.toFixed(2)), issues };
}
