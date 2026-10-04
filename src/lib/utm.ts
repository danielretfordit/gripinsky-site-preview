const KEY = 'gr-utm';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];

/** Запоминает первые и последние UTM-метки визита (только в браузере посетителя) */
export function captureUtm() {
  try {
    const q = new URLSearchParams(location.search);
    const found: Record<string, string> = {};
    for (const p of PARAMS) { const v = q.get(p); if (v) found[p] = v.slice(0, 200); }
    if (!Object.keys(found).length) return;
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const next = { first: saved.first ?? found, last: found, landing: saved.landing ?? location.pathname };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function readUtm(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
