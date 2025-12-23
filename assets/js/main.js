// Place small site-wide behaviors here (kept minimal on purpose).
document.addEventListener("DOMContentLoaded", () => {
  // Example: highlight current nav link (basic, optional)
  const path = location.pathname.replace(/\/+$/, "") || "/";
  document.querySelectorAll(".nav-links a").forEach(a => {
    const href = a.getAttribute("href");
    if (!href) return;
    const normalized = href.replace(/\/+$/, "") || "/";
    if (normalized === path) a.style.color = "rgba(255,255,255,0.92)";
  });
});
