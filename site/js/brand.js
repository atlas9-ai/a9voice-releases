// /brand: select a hex value to copy it. Without this script the values are plain text.
(() => {
  const status = document.getElementById("copy-status");
  const copy = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
    }
    const t = document.createElement("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.append(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* ignore */ }
    t.remove();
    return ok;
  };
  document.querySelectorAll(".sw-hex").forEach((el) => {
    const hex = el.textContent.trim();
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sw-copy";
    b.textContent = hex;
    b.setAttribute("aria-label", `Copy ${hex}`);
    b.addEventListener("click", async () => {
      const ok = await copy(hex);
      b.classList.toggle("copied", ok);
      if (status) {
        status.textContent = "";
        setTimeout(() => { status.textContent = ok ? `Copied ${hex}` : `Could not copy ${hex}. Select it and press Ctrl+C.`; }, 30);
      }
      if (ok) setTimeout(() => b.classList.remove("copied"), 1600);
    });
    el.replaceChildren(b);
  });
})();
