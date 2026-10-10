// /demo: chapter links seek the video (and play it); #t=<seconds> in the address does the same on load.
// /demo?play=1 (the home page's "Watch the demo" link) starts it too: with sound if the browser allows it,
// else muted with a "Tap for sound" pill. Plain /demo never plays by itself.
(() => {
  const v = document.getElementById("demo-video");
  if (!v) return;
  const links = [...document.querySelectorAll(".chapters a[data-t]")];
  const seek = (t, play) => {
    const go = () => { v.currentTime = t; if (play) v.play().catch(() => {}); };
    if (v.readyState > 0) go(); else v.addEventListener("loadedmetadata", go, { once: true });
  };
  links.forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    seek(Number(a.dataset.t), true);
    history.replaceState(null, "", a.getAttribute("href"));
  }));
  const m = /^#t=(\d+)$/.exec(location.hash);
  if (m && Number(m[1]) < 53) seek(Number(m[1]), false);
  if (new URLSearchParams(location.search).get("play") === "1") {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "btn btn-primary demo-sound";
    pill.append("🔊 Tap for sound");
    const gone = () => pill.remove();
    pill.addEventListener("click", () => { v.muted = false; v.currentTime = 0; v.play().catch(() => {}); gone(); });
    v.addEventListener("volumechange", () => { if (!v.muted) gone(); });
    v.play().catch(() => {
      v.muted = true;
      v.parentElement.append(pill);
      v.play().catch(() => {}); // still blocked (data saver, say): the pill and the play button are each a click away
    });
  }
  v.addEventListener("timeupdate", () => {
    let cur = null;
    for (const a of links) if (v.currentTime >= Number(a.dataset.t)) cur = a;
    links.forEach((a) => a.classList.toggle("on", a === cur && !v.paused));
  });
})();
