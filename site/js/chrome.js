// Loaded on every page: the campaign carry for Download links, and the phone menu sheet (820 px and
// below: a button opens it; Esc, a click outside or a tap on a link closes it). No network requests.
(function () {
  "use strict";

  // Campaign carry: the first page of a visit may arrive with utm_* in its address. Keep them for the
  // visit (sessionStorage: no cookie, gone when the tab closes) and add them to every Download link
  // as src/med/ct/cmp, so the download is attributed to the post that brought the visitor.
  // Tags are lower case a-z 0-9 _ . : - and at most 40 long; anything else is dropped.
  try {
    var tag = function (v) { v = String(v || "").trim().toLowerCase(); return /^[a-z0-9_.:-]{1,40}$/.test(v) ? v : ""; };
    var KEY = "a9v-campaign";
    var seen = null;
    try { seen = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { seen = null; }
    if (!seen) {
      var q = new URLSearchParams(location.search);
      var s = tag(q.get("utm_source"));
      if (s) {
        seen = { src: s, med: tag(q.get("utm_medium")), ct: tag(q.get("utm_content")), cmp: tag(q.get("utm_campaign")) };
        try { sessionStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) { /* private mode: still works for this page */ }
      }
    }
    if (seen) {
      Array.prototype.forEach.call(document.querySelectorAll('a[href^="/download"]'), function (a) {
        var u = new URL(a.getAttribute("href"), location.origin);
        ["src", "med", "ct", "cmp"].forEach(function (k) { if (seen[k]) u.searchParams.set(k, seen[k]); });
        a.setAttribute("href", u.pathname + u.search);
      });
    }
  } catch (e) { /* a broken storage must never break the page */ }

  var btn = document.querySelector(".sn-menu");
  var sheet = document.getElementById("sn-sheet");
  if (!btn || !sheet) return;
  var set = function (open) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Menu");
    sheet.classList.toggle("open", open);
  };
  btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
  sheet.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("a")) set(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sheet.classList.contains("open")) { set(false); btn.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (sheet.classList.contains("open") && !sheet.contains(e.target) && !btn.contains(e.target)) set(false);
  });
  var wide = window.matchMedia("(min-width: 821px)");
  var close = function () { if (wide.matches) set(false); };
  if (wide.addEventListener) wide.addEventListener("change", close);
})();
