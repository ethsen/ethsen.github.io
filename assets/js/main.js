(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Add a tiny “boot” class for any future animation hooks.
  document.documentElement.classList.add("boot");

  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const root = document.documentElement;
  const stored = (() => {
    try {
      return localStorage.getItem("theme");
    } catch {
      return null;
    }
  })();

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialDark = stored ? stored === "dark" : prefersDark;

  const applyTheme = (isDark) => {
    root.classList.toggle("theme-dark", isDark);
    toggle.textContent = isDark ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
  };

  applyTheme(initialDark);

  toggle.addEventListener("click", () => {
    const isDark = !root.classList.contains("theme-dark");
    applyTheme(isDark);
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // Ignore storage failures.
    }
  });

  const gallery = document.getElementById("about-gallery");
  if (!gallery) return;

  const controls = document.querySelectorAll("[data-gallery]");
  controls.forEach(btn => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-gallery");
      const delta = dir === "prev" ? -1 : 1;
      const cardWidth = gallery.firstElementChild ? gallery.firstElementChild.getBoundingClientRect().width : 240;
      gallery.scrollBy({ left: delta * (cardWidth + 12), behavior: "smooth" });
    });
  });
})();
