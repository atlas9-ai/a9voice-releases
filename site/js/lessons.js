// Lesson pop-ups: a "▶ Watch" chip (a.lesson-chip[data-lesson], built from site/lessons.json) opens the lesson in the same kind of
// lightbox as the home page's demo (css/lightbox.css; a native modal dialog gives Esc, the focus trap, the inert page and the focus
// return). Same rules as that one: play() is called synchronously inside the click, which is the only way a browser lets a video
// start with sound; closing pauses and resets; nothing loads before the click (preload="none", no src until then). Without JS, or on
// a middle-click or new tab, the chip is a plain link to the 16:9 MP4. Phones (up to 600 px) get the 9:16 file with its words burned
// in; everyone else gets the 16:9 with its captions track on. Native video only: no YouTube, no third-party script.
(() => {
  const chips = document.querySelectorAll("a.lesson-chip[data-lesson]");
  if (!chips.length || typeof HTMLDialogElement === "undefined") return;
  let dlg = null;
  let frame = null;
  let video = null;

  const el = (tag, cls, attrs = {}, text = "") => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text) n.textContent = text;
    return n;
  };

  const build = () => {
    dlg = el("dialog", "lb", { "aria-modal": "true" });
    const box = el("div", "lb-box");
    const close = el("button", "lb-close", { type: "button", "aria-label": "Close" }, "✕");
    frame = el("div", "lb-frame");
    const note = el("p", "lb-note", {}, "Sarah is an AI presenter.");
    box.append(close, frame, note);
    dlg.append(box);
    document.body.append(dlg);
    close.addEventListener("click", () => dlg.close());
    // The dialog fills the screen and is see-through: a click that lands on it, not on the box, is a click on the scrim.
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", () => {
      if (!video) return;
      video.pause();
      video.currentTime = 0;
      video.removeAttribute("src");
      video.load(); // drops what was buffered; the next open starts clean
    });
  };

  chips.forEach((chip) => chip.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!dlg) build();
    if (typeof dlg.showModal !== "function") return; // let the link go to the MP4
    const d = chip.dataset;
    const vertical = !!d.src9 && window.matchMedia("(max-width: 600px)").matches;
    e.preventDefault();
    dlg.setAttribute("aria-label", "Lesson: " + (d.title || "video"));
    frame.classList.toggle("vert", vertical);
    video = el("video", "", { controls: "", playsinline: "", preload: "none", poster: d.poster || "", "aria-label": (d.title || "Lesson") + ", a short video" });
    if (!vertical && d.vtt) {
      const t = el("track", "", { kind: "captions", src: d.vtt, srclang: "en", label: "English", default: "" });
      video.append(t);
    }
    frame.replaceChildren(video);
    dlg.showModal();
    video.src = vertical ? d.src9 : d.src16;
    video.currentTime = 0;
    if (!vertical && video.textTracks && video.textTracks[0]) video.textTracks[0].mode = "showing";
    video.play().catch(() => {}); // the controls are right there if a browser still says no
    video.focus({ preventScroll: true });
  }));
})();
