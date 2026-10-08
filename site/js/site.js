// Hero demo, screenshot tabs, mobile menu, latest version, campaign carry. The only requests
// to other hosts: the GitHub API call for the version number and Cloudflare's cookieless
// Web Analytics beacon (a separate script, present only when the site has a token).
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
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hero: idle -> recording -> transcribing -> pasted. The HTML ships the end state,
  // so reduced motion (and no JS) shows "Pasted 0.23 s" with the text in the email.
  var demo = document.getElementById("demo");
  var typed = document.getElementById("typed");
  if (demo && typed && !reduce) {
    var line = typed.textContent;
    var phases = ["idle", "rec", "think", "done"];
    var dur = [1400, 2600, 450, 3200];
    var i = 0;
    var show = function () {
      demo.setAttribute("data-phase", phases[i]);
      typed.textContent = phases[i] === "done" ? line : "";
    };
    var step = function () {
      i = (i + 1) % phases.length;
      show();
      setTimeout(step, dur[i]);
    };
    show();
    setTimeout(step, dur[0]);
  }

  // Hero loop: plays once it's on screen, unless the user prefers less motion
  // (then the poster stays).
  var video = document.getElementById("hero-video");
  if (video && !reduce && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { video.preload = "auto"; video.play().catch(function () {}); }
        else video.pause();
      });
    }).observe(video);
  }

  // Screenshot tabs (WAI-ARIA tabs pattern: arrows, Home, End).
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var pick = function (tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach(function (t, n) {
    t.addEventListener("click", function () { pick(t, false); });
    t.addEventListener("keydown", function (e) {
      var to = null;
      if (e.key === "ArrowRight") to = tabs[(n + 1) % tabs.length];
      else if (e.key === "ArrowLeft") to = tabs[(n - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") to = tabs[0];
      else if (e.key === "End") to = tabs[tabs.length - 1];
      if (to) { e.preventDefault(); pick(to, true); }
    });
  });

  // Mobile menu.
  var menu = document.querySelector(".menu");
  var nav = document.getElementById("nav");
  if (menu && nav) {
    var set = function (open) {
      menu.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("open", open);
    };
    menu.addEventListener("click", function () { set(menu.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") set(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { set(false); menu.focus(); }
    });
  }

  // Version line: the latest release tag, or "latest" if GitHub can't be reached.
  var ver = document.getElementById("ver");
  if (ver && window.fetch) {
    fetch("https://api.github.com/repos/atlas9-ai/a9voice-releases/releases/latest", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && typeof j.tag_name === "string") ver.textContent = j.tag_name.replace(/^v/, "");
      })
      .catch(function () {});
  }
})();
