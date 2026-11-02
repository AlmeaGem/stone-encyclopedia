type Entry = { url: string; previous?: string; next?: string };
type Ledger = {
  entries: Record<string, Entry>;
  pending?: { from: string; url: string };
};
type BrowserNavigation = EventTarget & {
  currentEntry?: { index: number };
  entries(): { index: number; url?: string }[];
};

export function isSiteHistoryUrl(value: string, base: string, origin: string) {
  try {
    const url = new URL(value);
    return (
      url.origin === origin &&
      !url.username &&
      !url.password &&
      (url.pathname === base.replace(/\/$/, '') ||
        url.pathname.startsWith(base))
    );
  } catch {
    return false;
  }
}

export function initializeHistoryNavigation() {
  const nav = document.querySelector<HTMLElement>('[data-history-base]');
  if (!nav) return;
  const base = nav.dataset.historyBase!;
  const buttons = [...nav.querySelectorAll<HTMLButtonElement>('button')];
  const allowed = (url: string) => isSiteHistoryUrl(url, base, location.origin);
  const native = (window as Window & { navigation?: BrowserNavigation })
    .navigation;
  const storageKey = 'almea-local-history-v1';
  const stateKey = '__almeaHistory';
  let ledger: Ledger = { entries: {} };
  let current = '';
  let storageAvailable = true;
  let traversing = false;
  let moving = false;
  const save = () => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(ledger));
    } catch {
      storageAvailable = false;
    }
  };
  const load = () => {
    try {
      ledger = JSON.parse(
        sessionStorage.getItem(storageKey) || '{"entries":{}}',
      );
      if (!ledger.entries || typeof ledger.entries !== 'object')
        throw Error('Invalid local history');
    } catch {
      ledger = { entries: {} };
      storageAvailable = false;
    }
  };
  function fallbackEntry() {
    load();
    const existing = history.state?.[stateKey];
    if (
      typeof existing === 'string' &&
      ledger.entries[existing]?.url === location.href
    ) {
      current = existing;
      return;
    }
    current = crypto.randomUUID();
    const entry: Entry = { url: location.href };
    const pending = ledger.pending;
    // Confirm a same-tab, same-site link transition; never infer history from its length.
    if (
      pending &&
      pending.url === location.href &&
      ledger.entries[pending.from]
    ) {
      const previous = ledger.entries[pending.from];
      const from = new URL(previous.url);
      from.hash = '';
      if (
        allowed(previous.url) &&
        (document.referrer === from.href ||
          from.href === location.href.split('#')[0])
      ) {
        entry.previous = pending.from;
        previous.next = current;
      }
    }
    ledger.entries[current] = entry;
    delete ledger.pending;
    try {
      history.replaceState({ ...history.state, [stateKey]: current }, '');
    } catch {
      storageAvailable = false;
    }
    save();
  }
  function destination(direction: number) {
    if (native) {
      const index = native.currentEntry?.index;
      const target = native
        .entries()
        .find((entry) => entry.index === (index ?? -100) + direction);
      return Boolean(target?.url && allowed(target.url));
    }
    if (!storageAvailable) return false;
    const entry = ledger.entries[current];
    const key = direction < 0 ? entry?.previous : entry?.next;
    return Boolean(
      key && ledger.entries[key] && allowed(ledger.entries[key].url),
    );
  }
  function update() {
    moving = false;
    if (!native) fallbackEntry();
    for (const button of buttons)
      button.disabled = !destination(Number(button.dataset.historyDirection));
  }
  for (const button of buttons)
    button.addEventListener('click', () => {
      if (moving) return;
      const direction = Number(button.dataset.historyDirection);
      if (!destination(direction)) {
        update();
        return;
      }
      moving = true;
      for (const control of buttons) control.disabled = true;
      if (!native) {
        const entry = ledger.entries[current];
        const key = direction < 0 ? entry.previous! : entry.next!;
        // Preserve the verified pair across our own traversal, including BFCache restores.
        if (direction < 0) ledger.entries[key].next = current;
        else ledger.entries[key].previous = current;
        delete ledger.pending;
        save();
        traversing = true;
      }
      history.go(direction);
    });
  if (!native) {
    document.addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null;
      delete ledger.pending;
      if (
        link &&
        !link.download &&
        (!link.target || link.target === '_self') &&
        allowed(link.href) &&
        link.href !== location.href
      )
        ledger.pending = { from: current, url: link.href };
      save();
    });
    window.addEventListener('pagehide', () => {
      if (!traversing && !ledger.pending && ledger.entries[current]) {
        delete ledger.entries[current].next;
        save();
      }
    });
  }
  window.addEventListener('pageshow', () => {
    traversing = false;
    update();
  });
  window.addEventListener('popstate', update);
  window.addEventListener('hashchange', update);
  native?.addEventListener('currententrychange', update);
  update();
}
