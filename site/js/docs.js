// The manual's search box and mobile menu. The index (/docs/search-index.json) is fetched on
// first use; the matching rules live in search.mjs, which CI tests with the same code.
import { prepare, search, snippet } from "/js/search.mjs";

const q = document.getElementById("docs-q");
const list = document.getElementById("docs-results");
const status = document.getElementById("docs-status");
let index = null;
let loading = null;

function load() {
  if (index) return Promise.resolve(index);
  if (!loading) {
    loading = fetch("/docs/search-index.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => (index = prepare(j)))
      .catch(() => {
        loading = null;
        return null;
      });
  }
  return loading;
}

function show(query) {
  if (!list || !status) return;
  const text = query.trim();
  if (!text) {
    list.hidden = true;
    list.replaceChildren();
    status.textContent = "";
    document.body.classList.remove("searching");
    return;
  }
  load().then((idx) => {
    if (q.value.trim() !== text) return;
    if (!idx) {
      status.textContent = "Search isn't available right now.";
      return;
    }
    const hits = search(idx, text);
    list.replaceChildren(
      ...hits.map((h) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = h.u;
        const t = document.createElement("span");
        t.className = "r-title";
        t.textContent = h.h === h.p ? h.p : `${h.h}`;
        const p = document.createElement("span");
        p.className = "r-page";
        p.textContent = h.p;
        const s = document.createElement("span");
        s.className = "r-snip";
        s.textContent = snippet(h, text);
        a.append(t, p, s);
        li.append(a);
        return li;
      })
    );
    if (!hits.length) {
      const li = document.createElement("li");
      li.className = "r-none";
      li.textContent = `Nothing found for "${text}". Try fewer or different words.`;
      list.append(li);
    }
    list.hidden = false;
    document.body.classList.add("searching");
    status.textContent = hits.length ? `${hits.length} result${hits.length === 1 ? "" : "s"}` : "No results";
  });
}

if (q) {
  q.addEventListener("focus", load, { once: true });
  q.addEventListener("input", () => show(q.value));
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      q.value = "";
      show("");
    } else if (e.key === "ArrowDown" && list && !list.hidden) {
      const a = list.querySelector("a");
      if (a) {
        e.preventDefault();
        a.focus();
      }
    }
  });
  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) {
      e.preventDefault();
      q.focus();
      q.select();
    }
  });
  list &&
    list.addEventListener("keydown", (e) => {
      const a = document.activeElement;
      if (!a || a.tagName !== "A") return;
      const li = a.closest("li");
      if (e.key === "ArrowDown" && li && li.nextElementSibling) {
        e.preventDefault();
        li.nextElementSibling.querySelector("a")?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        (li && li.previousElementSibling ? li.previousElementSibling.querySelector("a") : q).focus();
      }
    });
  const start = new URLSearchParams(location.search).get("q");
  if (start) {
    q.value = start;
    show(start);
  }
}

// Mobile: the manual menu folds under a button.
const toggle = document.querySelector(".docs-toggle");
const wrap = document.getElementById("docs-nav");
if (toggle && wrap) {
  document.documentElement.classList.add("js");
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    wrap.classList.toggle("open", open);
  });
}
