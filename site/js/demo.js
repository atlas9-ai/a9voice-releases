// /demo: chapter links seek the video (and play it); #t=<seconds> in the address does the same on load.
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
  if (m && Number(m[1]) < 60) seek(Number(m[1]), false);
  v.addEventListener("timeupdate", () => {
    let cur = null;
    for (const a of links) if (v.currentTime >= Number(a.dataset.t)) cur = a;
    links.forEach((a) => a.classList.toggle("on", a === cur && !v.paused));
  });
})();
