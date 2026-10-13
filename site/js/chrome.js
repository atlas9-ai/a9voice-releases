// Loaded on every page: the visit's campaign carry and its one visit beacon, the internal switch, the download
// page's download_view beacon, the phone hand-off ("Send it to my PC": email, share or copy the link), and the phone
// menu sheet (820 px and below: a button opens it; Esc, a click outside or a tap on a link closes it). The requests
// are the beacons to a9voice.com/e and, only when a phone visitor asks, POST /handoff/email (docs/metrics.md).
// No cookies, no IDs.
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
    var beacon = function (ev, extra) {
      var p = tags();
      if (extra) Object.keys(extra).forEach(function (k) { p.set(k, extra[k]); });
      var url = "/e?ev=" + ev + "&" + p.toString();
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

    // The download page loaded in a browser that ran this script: the human denominator for the click rate.
    // (The Worker's own download_page row is written when the page is served, so scanners count there.)
    var path = String(location.pathname || "").replace(/\/+$/, "");
    if (path === "/download" || path === "/download/dev") beacon("download_view", path === "/download/dev" ? { ch: "dev" } : null);

    // Phones can't run a Windows app, so on a phone every Download button becomes "Send it to my PC" and opens
    // a panel: email the link (the Worker sends it and writes the phone_link row), share it, or copy it. The link
    // keeps the visit's channel, so the PC visit lands on the same row of the story and on the download page.
    // A cancelled share, or a copy that failed, sends nothing.
    if (phone) {
      var LABEL = "Send it to my PC";
      var panel = null;

      var handoffLink = function () {
        var src = seen.src || siteName(seen.ref) || "direct";
        return "https://a9voice.com/download?utm_source=" + encodeURIComponent(src) + "&utm_medium=phone-handoff" +
          (seen.cmp ? "&utm_campaign=" + encodeURIComponent(seen.cmp) : "") +
          (seen.ct ? "&utm_content=" + encodeURIComponent(seen.ct) : "") + "&pl=phone-handoff";
      };

      var h = function (tagName, cls, attrs, text) {
        var n = document.createElement(tagName);
        if (cls) n.className = cls;
        if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
        if (text) n.textContent = text;
        return n;
      };

      var build = function () {
        var dlg = h("dialog", "hp", { "aria-labelledby": "hp-title" });
        var form = h("form", "hp-box", { novalidate: "" });
        var close = h("button", "hp-close", { type: "button", "aria-label": "Close" }, "✕");
        var title = h("h2", "hp-title", { id: "hp-title", tabindex: "-1" }, LABEL);
        var lead = h("p", "hp-lead", null, "A9 Voice is a Windows app. We’ll email you the download link so you can open it on your PC.");
        var field = h("label", "hp-field");
        var input = h("input", "hp-input", { type: "email", name: "email", autocomplete: "email", inputmode: "email", maxlength: "254", placeholder: "you@example.com", "aria-label": "Your email address" });
        field.appendChild(input);
        // The honeypot: a person never sees it, a script that fills every field does.
        var trap = h("input", "hp-trap", { type: "text", name: "a9v_extra", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" });
        var send = h("button", "hp-send", { type: "submit" }, "Email me the link");
        var status = h("p", "hp-status", { role: "status", "aria-live": "polite" });
        var alt = h("div", "hp-alt");
        var share = navigator.share ? h("button", "hp-alt-btn", { type: "button" }, "Or share it") : null;
        var copy = h("button", "hp-alt-btn", { type: "button" }, "Copy link");
        var fine = h("p", "hp-fine", null, "We send that one email and don’t keep your address.");
        if (share) alt.appendChild(share);
        alt.appendChild(copy);
        [close, title, lead, field, trap, send, status, alt, fine].forEach(function (n) { form.appendChild(n); });
        dlg.appendChild(form);
        document.body.appendChild(dlg);

        var said = function (t, bad) {
          status.textContent = t;
          status.setAttribute("data-bad", bad ? "1" : "");
          input.setAttribute("aria-invalid", bad === "email" ? "true" : "false");
        };
        var shut = function () { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); };
        close.addEventListener("click", shut);
        // The dialog is only as wide as its box: a click that lands on it, not on the box, is a click on the scrim.
        dlg.addEventListener("click", function (e) { if (e.target === dlg) shut(); });

        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var email = String(input.value || "").trim();
          if (email.length < 5 || email.length > 254 || !/^[^@\s,;<>]+@[^@\s.,;<>]+(\.[^@\s.,;<>]+)+$/.test(email)) {
            said("That doesn’t look like an email address.", "email");
            return;
          }
          var body = { email: email, hp: String(trap.value || "") };
          KEYS.forEach(function (k) { if (seen[k]) body[k] = seen[k]; });
          if (internal) body.int = "1";
          if (ipad) body.dv = "ios";
          send.disabled = true;
          said("Sending…", "");
          var done = function (kind) {
            send.disabled = false;
            if (kind === "sent") {
              said("Sent. Check your email on your PC.", "");
              field.hidden = true;
              send.hidden = true;
              lead.hidden = true;
            } else if (kind === "bad") {
              said("That doesn’t look like an email address.", "email");
            } else if (kind === "limit") {
              said("That’s a few links already. Try again later, or use Copy link.", "1");
            } else {
              said("Couldn’t send. Try Copy link.", "1");
            }
          };
          if (typeof fetch !== "function") { done("error"); return; }
          fetch("/handoff/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }).then(function (r) {
            done(r.status === 200 || r.status === 204 ? "sent" : r.status === 400 ? "bad" : r.status === 429 ? "limit" : "error");
          }, function () { done("error"); });
        });

        if (share) {
          share.addEventListener("click", function () {
            var p;
            try { p = navigator.share({ title: "A9 Voice for Windows", url: handoffLink() }); } catch (e) { return; }
            // Only a share that finished counts: a cancelled sheet rejects, and sends nothing.
            if (p && p.then) p.then(function () { beacon("phone_link", { how: "share" }); said("Shared.", ""); }, function () { /* cancelled */ });
          });
        }

        copy.addEventListener("click", function () {
          var url = handoffLink();
          var copied = function () { beacon("phone_link", { how: "copy" }); said("Copied. Paste it into a note or message to yourself.", ""); };
          var manual = function () {
            // No clipboard: show the link where it can be pressed and held.
            input.value = url;
            input.type = "text";
            try { input.select(); } catch (e) { /* nothing to select */ }
            said("Press and hold the link to copy it.", "");
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(copied, manual);
          } else {
            var ok = false;
            try {
              var t = h("textarea", "hp-trap", { "aria-hidden": "true", tabindex: "-1" });
              t.value = url;
              document.body.appendChild(t);
              t.select();
              ok = !!document.execCommand("copy");
              if (t.remove) t.remove();
            } catch (e) { ok = false; }
            if (ok) copied(); else manual();
          }
        });

        return { dlg: dlg, title: title, status: status };
      };

      var open = function () {
        if (!panel) panel = build();
        if (typeof panel.dlg.showModal === "function") { if (!panel.dlg.open) panel.dlg.showModal(); }
        else panel.dlg.setAttribute("open", "");
        // Not the email field: the keyboard would cover Share and Copy.
        try { panel.title.focus(); } catch (e) { /* nothing to focus */ }
      };

      var convert = function (a) {
        if (a.getAttribute("data-handoff")) return;
        a.setAttribute("data-handoff", "1");
        a.setAttribute("aria-haspopup", "dialog");
        // A phone has nothing to download to: the label says what the button does, and the arrow icon goes.
        var icon = a.querySelector && a.querySelector("svg");
        if (icon && icon.remove) icon.remove();
        a.textContent = LABEL;
        a.addEventListener("click", function (e) {
          if (e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          open();
        });
      };
      // The demo's lightbox builds its Download button on the first click, long after this script ran.
      window.a9vPhone = { label: LABEL, convert: convert };

      var converted = 0;
      Array.prototype.forEach.call(document.querySelectorAll('a[href^="/download"]'), function (a) {
        if (!/(^|\s)(btn|sn-btn)(\s|$)/.test(a.className || "")) return; // a text link to the page stays a link
        convert(a);
        converted++;
      });

      // A page with no Download button of its own keeps the older line, which now opens the same panel.
      if (!converted) {
        Array.prototype.forEach.call(document.querySelectorAll("[data-phone-handoff]"), function (box) {
          box.hidden = false;
          var btn = box.querySelector(".phone-send");
          if (btn) btn.addEventListener("click", open);
        });
      }
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
