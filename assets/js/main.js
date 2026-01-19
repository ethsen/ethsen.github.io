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

  const controls = document.querySelectorAll("[data-gallery]");
  if (controls.length) {
    controls.forEach(btn => {
      btn.addEventListener("click", () => {
        const dir = btn.getAttribute("data-gallery");
        const delta = dir === "prev" ? -1 : 1;
        const targetId = btn.getAttribute("data-gallery-target");
        const gallery = targetId ? document.getElementById(targetId) : document.getElementById("about-gallery");
        if (!gallery) return;
        const cardWidth = gallery.firstElementChild ? gallery.firstElementChild.getBoundingClientRect().width : 240;
        gallery.scrollBy({ left: delta * (cardWidth + 12), behavior: "smooth" });
      });
    });
  }

  const lightboxState = (() => {
    if (!window.__lightboxState) window.__lightboxState = {};
    return window.__lightboxState;
  })();

  const ensureLightbox = () => {
    if (lightboxState.el) return;
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = `
      <button class="lightbox__close" type="button" aria-label="Close image">Close</button>
      <img class="lightbox__img" alt="">
      <div class="lightbox__caption" aria-live="polite"></div>
    `;
    document.body.appendChild(lightbox);
    lightboxState.el = lightbox;
    lightboxState.img = lightbox.querySelector(".lightbox__img");
    lightboxState.caption = lightbox.querySelector(".lightbox__caption");
    lightboxState.closeBtn = lightbox.querySelector(".lightbox__close");

    lightboxState.closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
        closeLightbox();
      }
    });
  };

  let pausedPagerId = null;
  const openLightbox = (img) => {
    ensureLightbox();
    const pagerId = img.getAttribute("data-pager-id");
    if (pagerId && window.__pagerAutoRegistry && window.__pagerAutoRegistry.has(pagerId)) {
      const ctrl = window.__pagerAutoRegistry.get(pagerId);
      ctrl?.pause?.();
      pausedPagerId = pagerId;
    }
    const figure = img.closest("figure");
    const captionText = img.dataset.lightboxCaption === "none"
      ? ""
      : (figure?.querySelector("figcaption")?.textContent?.trim() || "");
    lightboxState.img.src = img.currentSrc || img.src;
    lightboxState.img.alt = img.alt || "Gallery image";
    lightboxState.caption.textContent = captionText;
    lightboxState.caption.style.display = captionText ? "block" : "none";
    lightboxState.el.classList.add("is-open");
    lightboxState.el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lightboxState.closeBtn.focus();
  };

  const closeLightbox = () => {
    if (!lightboxState.el) return;
    lightboxState.el.classList.remove("is-open");
    lightboxState.el.setAttribute("aria-hidden", "true");
    lightboxState.img.src = "";
    lightboxState.caption.textContent = "";
    lightboxState.caption.style.display = "none";
    document.body.style.overflow = "";
    if (pausedPagerId && window.__pagerAutoRegistry && window.__pagerAutoRegistry.has(pausedPagerId)) {
      const ctrl = window.__pagerAutoRegistry.get(pausedPagerId);
      ctrl?.resume?.();
    }
    pausedPagerId = null;
  };

  const bindLightboxImages = () => {
    const galleryImages = document.querySelectorAll(".about img, #about-gallery img, .proj-body img");
    if (!galleryImages.length) return;

    galleryImages.forEach(img => {
      if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
      if (img.dataset.lightboxBound) return;
      img.dataset.lightboxBound = "true";
      if (img.closest(".proj-body")) img.dataset.lightboxCaption = "none";
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
  };

  ensureLightbox();
  bindLightboxImages();
  window.bindLightboxImages = bindLightboxImages;
})();
