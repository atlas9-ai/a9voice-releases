// /thanks: finds the license key for the Checkout Session Stripe sent the buyer here with. The key is made by the
// Worker when Stripe's webhook arrives (usually before this page loads, sometimes a few seconds after), so the page asks
// again for up to a minute. The session id comes from the address and is taken out of it once read.
(function () {
  "use strict";
  var SESSION = /^cs_(test|live)_[A-Za-z0-9]{8,200}$/;
  var TRIES = 30;
  var EVERY_MS = 2000;

  function $(id) { return document.getElementById(id); }

  function say(text) { $("th-status").textContent = text; }

  function show(key, email) {
    $("th-code").textContent = key;
    $("th-key").hidden = false;
    say("Payment received. Here is your key.");
    if (email) {
      $("th-email").textContent = "We also emailed it to " + email + ".";
      $("th-email").hidden = false;
    }
    $("th-copy").addEventListener("click", function () {
      var done = function () { $("th-copy").textContent = "Copied"; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(key).then(done, function () {});
      else done();
    });
  }

  function lookup(id, left) {
    fetch("/license/by-session?session_id=" + encodeURIComponent(id), { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (d && d.ok && d.key) return show(d.key, d.email);
        if (d && d.code === "pending" && left > 1) {
          say("Confirming your payment…");
          return setTimeout(function () { lookup(id, left - 1); }, EVERY_MS);
        }
        say(d && d.code === "pending"
          ? "Your payment is still being confirmed. Your key will be emailed to you as soon as it is, and you can reload this page in a minute."
          : "We couldn't find a purchase for this page. If you paid, your key is on its way by email.");
      })
      .catch(function () {
        if (left > 1) setTimeout(function () { lookup(id, left - 1); }, EVERY_MS);
        else say("We couldn't reach the server. Reload this page, or look for the key in your email.");
      });
  }

  var id = new URLSearchParams(location.search).get("session_id") || "";
  if (!SESSION.test(id)) {
    say("This page is for buyers: it shows the key for a payment you just made. If you paid, your key was emailed to you.");
    return;
  }
  // Out of the address bar and the history: a copied link then carries no purchase.
  try { history.replaceState(null, "", location.pathname); } catch (e) { /* the page still works */ }
  lookup(id, TRIES);
})();
