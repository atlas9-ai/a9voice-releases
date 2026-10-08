// Public copy guard: fails when text people can see names other products,
// the owner's lab or internal tooling.
//
//   node scripts/copy-guard.mjs [root]
//
// It reads what reaches people: the app's UI (Svelte, TypeScript and HTML,
// comments left out), the user-facing strings in the Rust core (string
// literals outside tests), the README, and the site and manual (site/). Code names stay allowed:
// identifiers like `com.riptide9.scribe`, `scribe.exe`, `SCRIBE_*` and
// `pause_auto_for_lab` aren't whole words to the matcher, or are listed below.
//
// Exceptions: `.copy-guard-allow` at the root, one entry per line:
//   path/glob            the whole file is allowed (e.g. a comparison page)
//   path/glob: word      only that word, in that file
//   path/glob: regions   only between <!-- copy-guard:allow --> and
//                        <!-- copy-guard:end --> in that file (a comparison
//                        table); the markers alone allow nothing
// Lines starting with # are comments.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const WORDS = [
  "lab", "scribe", "vowen", "python", "staff",
  // The owner's name and handle, and his employer's platform: never in copy. Web addresses are
  // exempt (see URLS) until the move to the Atlas9 organization.
  "wishon", "jwishon", "adt", "adtnow", "servicenow",
  // Other note takers and dictation apps.
  "otter", "fireflies", "granola", "wispr", "superwhisper", "tactiq", "fathom", "krisp", "rev.com",
];

// Code names that aren't copy.
const CODE_NAMES = [
  /com\.riptide9\.scribe/gi, /scribe\.exe/gi, /scribe_lib/gi, /Scribe-Setup-x64\.exe/gi,
  /SCRIBE_[A-Z_]+/g, /riptide9\.scribe/gi, /scribe-app(-releases)?/gi, /scribe\.log/gi,
];

// Web addresses aren't copy: a repository path may carry the owner's handle until the Atlas9 move.
const URLS = /(?:https?:\/\/|mailto:)[^\s"'<>)\]]+|(?<![A-Za-z0-9_.-])(?:github\.com|raw\.githubusercontent\.com)\/[^\s"'<>)\]]+/gi;

const root = process.argv[2] ?? process.cwd();

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", "dist", "target", ".git", "vendor"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p) => relative(root, p).split(sep).join("/");

function globRe(g) {
  return new RegExp("^" + g.trim().replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\/?/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*") + "$");
}

const allow = existsSync(join(root, ".copy-guard-allow"))
  ? readFileSync(join(root, ".copy-guard-allow"), "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
      .map((l) => { const i = l.indexOf(": "); return i < 0 ? { re: globRe(l), word: null } : { re: globRe(l.slice(0, i)), word: l.slice(i + 2).trim().toLowerCase() }; })
  : [];

/** The text people can see in a file (comments and test code left out). */
export function visible(path, text) {
  if (path.endsWith(".rs")) {
    const t = text.split(/^\s*#\[cfg\(test\)\]/m)[0];
    // String literals only: what the app shows or sends.
    return [...t.replace(/^\s*\/\/.*$/gm, "").matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map((m) => m[1]).join("\n");
  }
  if (/\.(svelte|ts|js|mjs|html|css)$/.test(path)) {
    return text
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
  }
  return text;
}

/** The text with its allowed regions blanked (line numbers kept). */
export function withoutRegions(text) {
  return text.replace(/<!--\s*copy-guard:allow\s*-->[\s\S]*?<!--\s*copy-guard:end\s*-->/g, (m) => m.replace(/[^\n]/g, " "));
}

export function hits(path, text) {
  let t = visible(path, text);
  for (const c of CODE_NAMES) t = t.replace(c, " ");
  t = t.replace(URLS, " ");
  const out = [];
  const lines = t.split(/\r?\n/);
  for (const w of WORDS) {
    const re = new RegExp(`(^|[^A-Za-z0-9_\\-])${w.replace(".", "\\.")}(?![A-Za-z0-9_\\-])`, "i");
    lines.forEach((l) => { if (re.test(l)) out.push({ word: w, line: l.trim().slice(0, 140) }); });
  }
  return out;
}

function scanned(p) {
  const r = rel(p);
  if (/\.test\.(ts|js|mjs)$/.test(r) || r === "scripts/copy-guard.mjs" || r.startsWith("scripts/")) return false;
  if (/^(src|site)\//.test(r) && /\.(svelte|ts|js|mjs|html)$/.test(r)) return !r.startsWith("site/tools/");
  if (/^[^/]+\.html$/.test(r)) return true;
  if (/^src-tauri\/src\/.*\.rs$/.test(r)) return true;
  if (/^(README\.md|site\/.*\.md)$/.test(r)) return true;
  return false;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(sep).join("/").split("/").pop())) {
  let bad = 0;
  for (const p of walk(root).filter(scanned)) {
    const r = rel(p);
    const mine = allow.filter((a) => a.re.test(r));
    let text = readFileSync(p, "utf8");
    if (mine.some((a) => a.word === "regions")) text = withoutRegions(text);
    for (const h of hits(p, text)) {
      if (mine.some((a) => a.word === null || a.word === h.word)) continue;
      bad++;
      console.log(`${r}: "${h.word}": ${h.line}`);
    }
  }
  if (bad) {
    console.error(`\ncopy guard: ${bad} line(s) name another product, the lab or internal tooling. ` +
      "Reword them, or (comparison pages only) list the file in .copy-guard-allow.");
    process.exit(1);
  }
  console.log("copy guard: clean");
}
