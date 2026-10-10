// Home page: "Watch the demo" opens the commercial in an in-page lightbox and plays it with sound.
// The play() call is made synchronously inside the click, which is the only way a browser lets a video start
// with sound. Without JS, or on a middle-click / new tab, the link still goes to /demo?play=1.
// Nothing loads before the click: the video has preload="none" and no src until then.
(() => {
  const link = document.querySelector("a.btn-demo");
  if (!link || typeof HTMLDialogElement === "undefined") return;
  const SRC = "/media/a9voice-demo-commercial-16x9.mp4";
  const POSTER = "/media/a9voice-demo-commercial-poster.jpg?v=2";
  const YT = "https://youtu.be/EulskU6w9YI";
  let dlg = null;
  let video = null;

  const el = (tag, cls, attrs = {}, text = "") => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text) n.textContent = text;
    return n;
  };

  const build = () => {
    dlg = el("dialog", "lb", { "aria-label": "A9 Voice demo" });
    const box = el("div", "lb-box");
    const close = el("button", "lb-close", { type: "button", "aria-label": "Close" }, "\u2715");
    const frame = el("div", "lb-frame");
    video = el("video", "", { controls: "", playsinline: "", preload: "none", poster: POSTER, "aria-label": "A9 Voice: meet Sarah, 53-second demo" });
    frame.append(video);
    const row = el("div", "lb-row");
    const yt = el("a", "lb-link", { href: YT, target: "_blank", rel: "noopener" }, "Watch on YouTube \u2197");
    const page = el("a", "lb-link", { href: "/demo" }, "Open demo page");
    const dl = el("a", "btn btn-primary", { href: link.dataset.dl || "/download", "data-src": "demo" }, "Download free");
    row.append(yt, page, dl);
    box.append(close, frame, row);
    dlg.append(box);
    document.body.append(dlg);
    close.addEventListener("click", () => dlg.close());
    // The dialog fills the screen and is see-through: a click that lands on it, not on the box, is a click on the scrim.
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", () => { video.pause(); video.currentTime = 0; });
  };

  link.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!dlg) build();
    if (typeof dlg.showModal !== "function") return; // let the link go to /demo?play=1
    e.preventDefault();
    dlg.showModal();
    if (!video.getAttribute("src")) video.src = SRC;
    video.currentTime = 0;
    video.play().catch(() => {}); // the controls are right there if a browser still says no
    video.focus({ preventScroll: true });
  });
})();
