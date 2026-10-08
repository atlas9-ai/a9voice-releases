// Features page: hero demo, screenshot tabs, latest version. The only request to another host is the
// GitHub API call for the version number. (Campaign carry for Download links lives in chrome.js.)
(function () {
  "use strict";

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
