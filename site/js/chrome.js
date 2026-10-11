// Loaded on every page: the visit's campaign carry and its one visit beacon, the internal switch, the phone
// hand-off, and the phone menu sheet (820 px and below: a button opens it; Esc, a click outside or a tap on a
// link closes it). The only request is the visit beacon to a9voice.com/e (docs/metrics.md). No cookies, no IDs.
(function () {
  "use strict";

  // Tags are lower case a-z 0-9 _ . : - and at most 40 long; anything else is dropped.
  var tag = function (v) { v = String(v || "").trim().toLowerCase(); return /^[a-z0-9_.:-]{1,40}$/.test(v) ? v : ""; };
  var OWN = /(^|\.)a9voice\.com$/;
  // Referrer host -> the name a person would give the place. The Worker has the same table (worker/src/index.js);
  // site/lib/chrome.test.mjs checks the two agree.
  var SITES = [
    [/(^|\.)reddit\.com$|(^|\.)redd\.it$/, "reddit"],
    [/(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$|^youtu\.be$/, "youtube"],
    [/(^|\.)x\.com$|(^|\.)twitter\.com$|^t\.co$/, "x"],
    [/(^|\.)ycombinator\.com$/, "hn"],
    [/(^|\.)github\.com$/, "github"],
    [/(^|\.)facebook\.com$|(^|\.)fb\.com$|^fb\.me$/, "facebook"],
    [/(^|\.)linkedin\.com$|^lnkd\.in$/, "linkedin"],
    [/(^|\.)instagram\.com$/, "instagram"],
    [/(^|\.)tiktok\.com$/, "tiktok"],
    [/^bsky\.app$/, "bluesky"],
    [/(^|\.)producthunt\.com$/, "producthunt"],
    [/(^|\.)google\.[a-z.]{2,6}$|(^|\.)bing\.com$|(^|\.)duckduckgo\.com$|(^|\.)brave\.com$|(^|\.)yahoo\.com$|(^|\.)ecosia\.org$|(^|\.)startpage\.com$|(^|\.)kagi\.com$|(^|\.)baidu\.com$|(^|\.)yandex\.[a-z]{2,3}$/, "search"]
  ];
  var siteName = function (host) {
    host = String(host || "").toLowerCase();
    if (!host || OWN.test(host)) return "";
    for (var i = 0; i < SITES.length; i++) if (SITES[i][0].test(host)) return SITES[i][1];
    return tag(host.replace(/^www\./, ""));
  };

  var ua = (navigator.userAgent || "");
  var ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPadOS asks as a Mac
  var phone = /Android|iPhone|iPad|iPod/.test(ua) || ipad;
  var seen = null;
  var internal = false;

  try {
    var q = new URLSearchParams(location.search);

    // The internal switch: ?a9v-internal=1 once per browser (=0 clears it). While it is set, int=1 rides on the
    // visit beacon and on every Download link, so the owner's own visits are marked, not counted.
    var sw = q.get("a9v-internal");
    try {
      if (sw === "1") localStorage.setItem("a9v-internal", "1");
      else if (sw === "0") localStorage.removeItem("a9v-internal");
      internal = localStorage.getItem("a9v-internal") === "1";
    } catch (e) { internal = sw === "1"; }
    if (internal) {
      var foot = document.querySelector(".sitefoot .sn-wrap");
      if (foot) {
        var chip = document.createElement("p");
        chip.className = "sf-internal";
        chip.textContent = "Internal: not counted";
        foot.appendChild(chip);
      }
    }

    // Campaign carry v2: the first page of a tab session keeps where the visit came from (utm_*, the external
    // referrer's host, the landing path) in sessionStorage: no cookie, gone when the tab closes. Stored even with no
    // UTMs. The links below get src/med/ct/cmp + ref + land, and never a change to their own `pl`.
    var KEY = "a9v-campaign";
    var first = false;
    try { seen = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { seen = null; }
    if (!seen || typeof seen !== "object") {
      var rh = "";
      try { rh = new URL(document.referrer).hostname.toLowerCase().slice(0, 60); } catch (e) { rh = ""; }
      if (!/^[a-z0-9.-]+$/.test(rh) || OWN.test(rh)) rh = "";
      var land = String(location.pathname || "/").toLowerCase();
      if (!/^\/[a-z0-9/_.~%-]*$/.test(land)) land = "";
      seen = {
        src: tag(q.get("utm_source")), med: tag(q.get("utm_medium")), ct: tag(q.get("utm_content")), cmp: tag(q.get("utm_campaign")),
        ref: rh, land: land.slice(0, 60)
      };
      first = true;
      try { sessionStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) { first = false; /* private mode: no way to send it once */ }
    }

    var KEYS = ["src", "med", "ct", "cmp", "ref", "land"];
    var tags = function () {
      var p = new URLSearchParams();
      KEYS.forEach(function (k) { if (seen[k]) p.set(k, seen[k]); });
      if (internal) p.set("int", "1");
      if (ipad) p.set("dv", "ios");
      return p;
    };
    var beacon = function (ev) {
      var url = "/e?ev=" + ev + "&" + tags().toString();
      try {
        if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
      } catch (e) { /* fall through */ }
      try { new Image().src = url; } catch (e) { /* nothing to do */ }
    };

    Array.prototype.forEach.call(document.querySelectorAll('a[href^="/download"]'), function (a) {
      var u = new URL(a.getAttribute("href"), location.origin);
      tags().forEach(function (v, k) { u.searchParams.set(k, v); });
      a.setAttribute("href", u.pathname + u.search);
    });

    if (first) beacon("visit");

    // Phones can't run a Windows app: offer to send the link to a PC. The shared address keeps the channel
    // (utm_source), so the PC visit lands on the same row of the story. One phone_link beacon per tap.
    if (phone) {
      Array.prototype.forEach.call(document.querySelectorAll("[data-phone-handoff]"), function (box) {
        box.hidden = false;
        var btn = box.querySelector(".phone-send");
        var note = box.querySelector(".phone-note");
        if (!btn) return;
        btn.addEventListener("click", function () {
          var src = seen.src || siteName(seen.ref) || "direct";
          var url = "https://a9voice.com/?utm_source=" + encodeURIComponent(src) + "&utm_medium=phone-handoff" +
            (seen.cmp ? "&utm_campaign=" + encodeURIComponent(seen.cmp) : "");
          beacon("phone_link");
          var said = function (t) { if (note) note.textContent = t; };
          if (navigator.share) {
            navigator.share({ title: "A9 Voice for Windows", url: url }).catch(function () { /* cancelled */ });
          } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () { said("Link copied. Open it on your PC."); }, function () { window.prompt("Copy this link", url); });
          } else {
            window.prompt("Copy this link", url);
          }
        });
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
