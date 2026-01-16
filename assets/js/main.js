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

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="Close image">Close</button>
    <img class="lightbox__img" alt="">
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector(".lightbox__img");
  const lightboxClose = lightbox.querySelector(".lightbox__close");

  const openLightbox = (img) => {
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt || "Gallery image";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  };

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
    document.body.style.overflow = "";
  };

  gallery.querySelectorAll("img").forEach(img => {
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    img.addEventListener("click", () => openLightbox(img));
    img.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(img);
      }
    });
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });
})();
