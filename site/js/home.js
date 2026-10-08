// The home page's motion. Nothing here talks to the network.
//
// - The HTML ships every scene in its final state, so no script and "reduce motion" both show the
//   finished picture. With motion on, each loop resets its scene and plays it.
// - A loop advances only while its section is on screen (data-loop sections get .vis from one
//   IntersectionObserver); CSS pauses their animations the same way. Off screen, nothing runs.
// - Sections that start below the fold glide in on scroll. What is on screen at load is never hidden.
// - Scene photos drift a little with scroll (parallax).
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var P = '<span class="dot"></span><span class="bars"><i></i><i></i><i></i><i></i></span>';

  // ---- Reduced motion: the HTML is already the final state, except the live transcript ----
  // (written by the loop below) and the call grid's speaker order.

  // ---- Which sections are on screen ----
  var waiting = [];
  var isVis = function (el) { return !!el && el.classList.contains("vis"); };
  // Resolves when `el` is on screen (at once if it is).
  var onscreen = function (el) {
    return isVis(el) ? Promise.resolve() : new Promise(function (r) { waiting.push([el, r]); });
  };
  if (!reduce && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js");
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle("vis", e.isIntersecting);
        if (!e.isIntersecting) return;
        waiting = waiting.filter(function (w) {
          if (w[0] !== e.target) return true;
          w[1]();
          return false;
        });
      });
    }, { threshold: 0.18 });
    document.querySelectorAll("[data-loop]").forEach(function (el) { watch.observe(el); });

    // Glide in. Only what starts below the fold is hidden first.
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove("pre");
        reveal.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    // Measured after the first frame, so the load itself never waits on layout.
    requestAnimationFrame(function () {
      document.querySelectorAll(".rv").forEach(function (el) {
        if (el.getBoundingClientRect().top > window.innerHeight) el.classList.add("pre");
        reveal.observe(el);
      });
    });

    // Parallax on the scene photos and the "why people switch" photo.
    var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene > img"));
    var sw = $("swimg");
    var queued = false;
    var par = function () {
      queued = false;
      var h = window.innerHeight;
      scenes.forEach(function (im) {
        var r = im.parentElement.getBoundingClientRect();
        if (r.bottom < -h || r.top > 2 * h) return;
        var k = (r.top + r.height / 2 - h / 2) / h;
        im.style.transform = "scale(1.12) translateY(" + (k * -5) + "%)";
      });
      if (sw) {
        var r2 = sw.parentElement.getBoundingClientRect();
        if (r2.bottom > -h && r2.top < 2 * h) sw.style.transform = "scale(1.15) translateY(" + ((r2.top / h) * -6) + "%)";
      }
    };
    window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(par); } }, { passive: true });
    requestAnimationFrame(par);
  } else if (!reduce) {
    // No IntersectionObserver: leave every scene in its final state.
    reduce = true;
  }
  if (reduce) {
    // Final state of the one scene the HTML can't ship: the live transcript.
    runRoom(true);
    return;
  }

  // ---- Hero: Ready -> recording 0:00-0:04 -> Transcribing -> Pasted, three sentences in turn ----
  (async function hero() {
    var root = $("top"), pill = $("hpill"), card = $("hcard");
    var texts = Array.prototype.slice.call($("htexts").children);
    var i = 0;
    while (true) {
      await onscreen(root);
      pill.innerHTML = P.replace('class="dot"', 'class="dot idle"') + '<span style="color:var(--muted)">Ready · Ctrl+Space</span>';
      card.classList.remove("on");
      await sleep(1400);
      for (var s = 0; s <= 4; s++) {
        await onscreen(root);
        pill.innerHTML = P + "<span>0:0" + s + "</span>";
        await sleep(520);
      }
      pill.innerHTML = "<span>Transcribing</span>";
      await sleep(260);
      await onscreen(root);
      texts.forEach(function (t, n) { t.classList.toggle("on", n === i % texts.length); });
      card.classList.add("on");
      pill.innerHTML = '<span class="ok">✓ Pasted · 0.23 s</span>';
      await sleep(2600);
      i++;
    }
  })();

  // ---- 8:52: the sentence lands in the email ----
  (async function mail() {
    var typed = $("typed"), pill = $("mailpill"), done = $("mailok");
    while (true) {
      pill.hidden = false; done.hidden = true; typed.classList.add("pend");
      await onscreen(typed.closest(".scene"));
      await sleep(3200);
      await onscreen(typed.closest(".scene"));
      pill.hidden = true; done.hidden = false; typed.classList.remove("pend");
      await sleep(5000);
    }
  })();

  // ---- 9:00: the Discard countdown, 8 to 1 ----
  (function discard() {
    var c = $("count"), scene = c.closest(".scene"), n = 8;
    setInterval(function () {
      if (!isVis(scene)) return;
      n = n <= 1 ? 8 : n - 1;
      c.textContent = n;
    }, 1000);
  })();

  // ---- 8:58: the fillers are struck out one at a time, then the clean sentence slides in ----
  (async function clean() {
    var sc = $("cleanScene");
    var fs = Array.prototype.slice.call(sc.querySelectorAll(".f")), w = sc.querySelector(".wrote");
    while (true) {
      fs.forEach(function (f) { f.classList.remove("x"); });
      w.classList.remove("on");
      await sleep(900);
      await onscreen(sc);
      for (var k = 0; k < fs.length; k++) { fs[k].classList.add("x"); await sleep(420); }
      await sleep(300);
      w.classList.add("on");
      await sleep(4200);
    }
  })();

  // ---- 9:03: the live call ----
  runRoom(false);

  // ---- 4:45 pm: the question types itself, then the answer fades in ----
  (async function ask() {
    var q = $("askq"), live = q.querySelector(".live"), a = $("aska");
    var Q = q.querySelector(".full").textContent;
    var scene = q.closest(".scene");
    q.classList.add("typing");
    while (true) {
      live.textContent = "";
      a.style.opacity = 0;
      await onscreen(scene);
      for (var i = 1; i <= Q.length; i++) { live.textContent = Q.slice(0, i); await sleep(45); }
      await sleep(500);
      a.style.transition = "opacity .5s";
      a.style.opacity = 1;
      await sleep(6000);
    }
  })();

  // The call grid and its transcript. `final` writes the finished transcript once (reduced motion).
  function runRoom(final) {
    var SP = {
      priya: ["Priya Nair", "var(--sp-priya)", "Speaker 3", 0],
      marco: ["Marco Silva", "var(--sp-marco)", "Speaker 2", 1],
      elena: ["Elena Ruiz", "var(--sp-elena)", "Speaker 4", 2],
      tom: ["Tom Becker", "var(--sp-tom)", "Speaker 5", 3]
    };
    var SCRIPT = [
      ["line", "priya", "00:00", "Thanks for joining. Today is the launch review for Northwind."],
      ["line", "marco", "00:09", "The beta went to four hundred users. Crash reports are down by half."],
      ["recog", "priya"],
      ["line", "elena", "00:21", "What's still blocking the launch date?"],
      ["tag", "marco"],
      ["line", "marco", "00:27", "The payment screen on older phones. Here's the crash chart.", "snap"],
      ["line", "tom", "00:41", "Design can have the store screenshots ready by Wednesday."],
      ["recog", "elena"],
      ["line", "priya", "00:49", "Then let's hold the launch for Monday the 20th."]
    ];
    var room = $("room"), ts = $("tscript"), figs = Array.prototype.slice.call($("rgrid").querySelectorAll("figure"));
    var toast = $("rtoast"), marco = $("rmarco"), flash = $("rflash");
    var named = {};
    function nameAll(k) {
      named[k] = 1;
      ts.querySelectorAll('.nm[data-k="' + k + '"]').forEach(function (n) { n.textContent = SP[k][0]; n.classList.remove("anon"); });
    }
    function say(ev) {
      var k = ev[1], d = document.createElement("div");
      d.className = "tl";
      d.innerHTML = '<span class="who"><span class="nm' + (named[k] ? "" : " anon") + '" data-k="' + k + '" style="color:' + SP[k][1] + '">' +
        (named[k] ? SP[k][0] : SP[k][2]) + "</span><time>" + ev[2] + "</time></span><p>" + ev[3] + "</p>" +
        (ev[4] === "snap" ? '<div class="snap"><span></span>Screenshot · 00:27 · saved to images/</div>' : "");
      ts.appendChild(d);
      while (ts.querySelectorAll(".tl").length > 4) ts.querySelector(".tl").remove();
      figs.forEach(function (f, i) { f.classList.toggle("talking", i === SP[k][3]); });
    }
    function pop(html) {
      toast.innerHTML = html;
      toast.classList.add("on");
      setTimeout(function () { toast.classList.remove("on"); }, 2200);
    }
    if (final) {
      SCRIPT.forEach(function (e) { if (e[0] === "line") say(e); });
      Object.keys(SP).forEach(nameAll);
      return;
    }
    (async function loop() {
      while (true) {
        ts.querySelectorAll(".tl").forEach(function (n) { n.remove(); });
        Object.keys(named).forEach(function (k) { delete named[k]; });
        marco.classList.remove("chart");
        await onscreen(room);
        for (var n = 0; n < SCRIPT.length; n++) {
          var ev = SCRIPT[n];
          await onscreen(room);
          if (ev[0] === "line") {
            if (ev[4] === "snap") {
              marco.classList.add("chart");
              await sleep(900);
              flash.classList.remove("go");
              void flash.offsetWidth;
              flash.classList.add("go");
              pop("<b>Win+Shift+S</b> · screenshot added at 00:27");
              await sleep(500);
            }
            say(ev);
            await sleep(2100);
            if (ev[4] === "snap") marco.classList.remove("chart");
          } else if (ev[0] === "recog") {
            nameAll(ev[1]);
            pop("Recognized <b>" + SP[ev[1]][0] + "</b> by voice");
            await sleep(1300);
          } else if (ev[0] === "tag") {
            nameAll(ev[1]);
            pop("You tagged <b>" + SP[ev[1]][0] + "</b>. Every line updated.");
            await sleep(1300);
          }
        }
        await sleep(3500);
      }
    })();
  }
})();
