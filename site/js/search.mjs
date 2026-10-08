// Search over the manual. Pure functions, no DOM: the page script (docs.js) and the CI
// check (scripts/docs-check.mjs) both import this file, so "the search finds it" is
// tested with the code that runs on the page.
//
// An index entry is { u: "/docs/page/#anchor", p: "Page title", h: "Section heading", t: "section text" }.

/** Lower-case words: "Keep microphone ready" -> ["keep", "microphone", "ready"]. */
export function words(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Adds the lower-cased fields the search compares against. Call once after loading. */
export function prepare(entries) {
  return entries.map((e) => ({ ...e, _h: words(e.h).join(" "), _p: words(e.p).join(" "), _t: " " + words(e.t).join(" ") + " " }));
}

/** Entries that contain every word of the query (a word may be the start of a longer one), best first. */
export function search(prepared, query, limit = 12) {
  const q = words(query);
  if (!q.length) return [];
  const phrase = q.join(" ");
  const out = [];
  for (const e of prepared) {
    const hay = `${e._h} ${e._p} ${e._t}`;
    if (!q.every((w) => hay.includes(w))) continue;
    let score = 0;
    if (e._h === phrase) score += 120;
    else if (e._h.includes(phrase)) score += 60;
    if (e._t.includes(" " + phrase)) score += 25;
    for (const w of q) {
      if (e._h.split(" ").some((x) => x.startsWith(w))) score += 12;
      if (e._p.includes(w)) score += 3;
      if (e._t.includes(" " + w)) score += 2;
    }
    out.push({ e, score });
  }
  out.sort((a, b) => b.score - a.score || a.e.u.localeCompare(b.e.u));
  return out.slice(0, limit).map((x) => x.e);
}

/** A short piece of the entry's text around the first matching word. */
export function snippet(entry, query, size = 140) {
  const text = entry.t.replace(/\s+/g, " ").trim();
  const low = text.toLowerCase();
  let at = -1;
  for (const w of words(query)) {
    const i = low.indexOf(w);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  const start = Math.max(0, at < 0 ? 0 : at - 40);
  const cut = text.slice(start, start + size);
  return (start > 0 ? "…" : "") + cut + (start + size < text.length ? "…" : "");
}
