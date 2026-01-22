let projectsIndexCachePromise = null;
const projectCache = new Map();

async function loadProjectsIndex() {
  if (!projectsIndexCachePromise) {
    projectsIndexCachePromise = fetch(getBasePath() + "assets/data/projects/index.json", { cache: "no-store" })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load projects index");
        return res.json();
      })
      .then(data => (Array.isArray(data.projects) ? data.projects : []));
  }
  return projectsIndexCachePromise;
}

async function loadProject(slug) {
  if (!slug) return null;
  if (projectCache.has(slug)) return projectCache.get(slug);
  const promise = fetch(getBasePath() + `assets/data/projects/${encodeURIComponent(slug)}.json`, { cache: "no-store" })
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load project ${slug}`);
      return res.json();
    });
  projectCache.set(slug, promise);
  return promise;
}

// Works on root domain and on https://USER.github.io/REPO/
function getBasePath() {
  // If current path ends with /about/, /projects/, etc., we need to go up.
  // We’ll detect by counting segments after the repo base.
  const path = window.location.pathname;
  const isInSubdir = /\/(about|projects|resume)\//.test(path);
  return isInSubdir ? "../" : "";
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) node.appendChild(child);
  return node;
}

function safeLink(href) {
  // Allow relative links and https links. (Keep it simple.)
  if (!href) return null;
  if (href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) return href;
  if (href.startsWith("https://")) return href;
  return href; // fallback
}

function projectUrl(slug, view = "glance") {
  // project.html is inside /projects/
  const inProjectsDir = /\/projects\//.test(window.location.pathname);
  if (inProjectsDir) {
    return `project.html?slug=${encodeURIComponent(slug)}&view=${encodeURIComponent(view)}`;
  }
  const base = getBasePath();
  return `${base}projects/project.html?slug=${encodeURIComponent(slug)}&view=${encodeURIComponent(view)}`;
}

function projectThumb(p) {
  const thumb = p.thumbnail || p.thumb;
  if (thumb) {
    if (thumb.startsWith("http://") || thumb.startsWith("https://")) return thumb;
    const clean = thumb.replace(/^\//, "");
    return getBasePath() + clean;
  }
  return getBasePath() + "assets/img/project-placeholder.svg";
}

function renderChips(tags) {
  const wrap = el("div", { class: "chips" });
  (tags || []).forEach(t => wrap.appendChild(el("span", { class: "chip", text: t })));
  return wrap;
}

function getMainTags(project) {
  if (Array.isArray(project?.mainTags) && project.mainTags.length) return project.mainTags;
  return project?.tags || [];
}

function renderProjectCard(p) {
  const badges = [];
  if (p.featured) badges.push(el("span", { class: "badge", text: "featured" }));
  if (p.year) badges.push(el("span", { class: "badge", text: String(p.year) }));

  const thumb = el("a", { class: "proj__thumb", href: projectUrl(p.slug, "glance") }, [
    el("img", { src: projectThumb(p), alt: p.title ? `Thumbnail for ${p.title}` : "Project thumbnail", loading: "lazy" })
  ]);

  const title = el("h3", { class: "proj__title" }, [
    el("a", { href: projectUrl(p.slug, "glance"), text: p.title || "Untitled" })
  ]);

  const desc = el("p", { class: "proj__desc", text: p.summary || "" });

  const meta = badges.length ? el("div", { class: "proj__meta" }, badges) : null;
  const top = el("div", { class: "proj__top" }, meta ? [title, meta] : [title]);

  const card = el("article", { class: "card proj", "data-slug": p.slug || "" }, [
    thumb,
    top,
    desc
  ]);

  return card;
}

function uniqueTags(projects) {
  const set = new Set();
  projects.forEach(p => getMainTags(p).forEach(t => set.add(t)));
  return [...set].sort((a,b) => a.localeCompare(b));
}

/* ---------- Page initializers ---------- */

async function initHomeProjects() {
  const mount = document.getElementById("featured-projects");
  if (!mount) return;

  const search = document.getElementById("home-search");
  const tagSel = document.getElementById("home-tag");

  const projects = await loadProjectsIndex();

  if (tagSel) {
    uniqueTags(projects).forEach(t => tagSel.appendChild(el("option", { value: t, text: t })));
  }

  function apply() {
    const q = (search?.value || "").trim().toLowerCase();
    const tag = tagSel?.value || "";

    let out = [...projects];

    if (tag) out = out.filter(p => getMainTags(p).includes(tag));
    if (q) {
      out = out.filter(p => {
        const blob = [
          p.title, p.summary, p.subtitle,
          ...(p.tags || []),
          ...(p.mainTags || []),
          ...(p.tech || []),
        ].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(q);
      });
    }

    out.sort((a,b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || ((b.year||0)-(a.year||0)));

    mount.innerHTML = "";
    out.forEach(p => mount.appendChild(renderProjectCard(p)));

    if (!out.length) {
      mount.appendChild(el("div", { class: "card card--wide" }, [
        el("h3", { text: "No matches" }),
        el("p", { class: "muted", text: "Try a different tag or search query." })
      ]));
    }
  }

  [search, tagSel].forEach(x => x && x.addEventListener("input", apply));
  apply();
}

async function initProjectsIndex() {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;

  const search = document.getElementById("proj-search");
  const tagSel = document.getElementById("proj-tag");
  const sortSel = document.getElementById("proj-sort");

  const projects = await loadProjectsIndex();

  // Populate tag dropdown
  uniqueTags(projects).forEach(t => tagSel.appendChild(el("option", { value: t, text: t })));

  function apply() {
    const q = (search.value || "").trim().toLowerCase();
    const tag = tagSel.value || "";
    const sort = sortSel.value;

    let out = [...projects];

    if (tag) out = out.filter(p => getMainTags(p).includes(tag));
    if (q) {
      out = out.filter(p => {
        const blob = [
          p.title, p.summary, p.subtitle,
          ...(p.tags || []),
          ...(p.mainTags || []),
          ...(p.tech || []),
        ].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(q);
      });
    }

    if (sort === "title") out.sort((a,b) => (a.title||"").localeCompare(b.title||""));
    if (sort === "newest") out.sort((a,b) => (b.year||0) - (a.year||0));
    if (sort === "featured") out.sort((a,b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || ((b.year||0)-(a.year||0)));

    grid.innerHTML = "";
    out.forEach(p => grid.appendChild(renderProjectCard(p)));

    if (!out.length) {
      grid.appendChild(el("div", { class: "card card--wide" }, [
        el("h3", { text: "No matches" }),
        el("p", { class: "muted", text: "Try a different tag or search query." })
      ]));
    }
  }

  [search, tagSel, sortSel].forEach(x => x && x.addEventListener("input", apply));
  apply();
}

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function isGithubLink(link) {
  if (!link) return false;
  const href = String(link.href || "").toLowerCase();
  const label = String(link.label || "").toLowerCase();
  const iconAlt = String(link.iconAlt || "").toLowerCase();
  return href.includes("github.com")
    || iconAlt.includes("github")
    || label.includes("github")
    || /\brepo\b/.test(label);
}

function isReportLink(link) {
  if (!link) return false;
  const label = String(link.label || "").toLowerCase();
  return label.includes("report");
}

function renderLinks(links) {
  const wrap = document.getElementById("proj-links");
  if (!wrap) return;

  wrap.innerHTML = "";
  let orderedLinks = links || [];
  const hasGithub = orderedLinks.some(isGithubLink);
  const hasReport = orderedLinks.some(isReportLink);
  if (hasGithub && hasReport) {
    const githubLinks = [];
    const reportLinks = [];
    const restLinks = [];
    orderedLinks.forEach(l => {
      if (isGithubLink(l)) githubLinks.push(l);
      else if (isReportLink(l)) reportLinks.push(l);
      else restLinks.push(l);
    });
    orderedLinks = [...githubLinks, ...reportLinks, ...restLinks];
  }

  orderedLinks.forEach(l => {
    const href = safeLink(l.href);
    if (!href) return;

    const isExternal = href.startsWith("https://");
    const className = "btn btn--small "
      + (l.kind === "primary" ? "" : "btn--ghost")
      + (l.iconOnly ? " btn--icon" : "");
    const attrs = {
      class: className,
      href,
      target: isExternal ? "_blank" : "_self",
      rel: isExternal ? "noreferrer" : ""
    };
    if (l.iconOnly && l.label) {
      attrs["aria-label"] = l.label;
      attrs.title = l.label;
    }

    const children = [];
    if (l.icon) {
      const lightIcon = l.iconLight || l.icon;
      const darkIcon = l.iconDark || l.icon;
      const useDark = document.documentElement.classList.contains("theme-dark");
      children.push(el("img", {
        class: "btn__icon",
        src: assetUrl(useDark ? darkIcon : lightIcon),
        alt: l.iconOnly ? "" : (l.iconAlt || l.label || "icon"),
        loading: "lazy",
        "data-icon-light": lightIcon ? assetUrl(lightIcon) : "",
        "data-icon-dark": darkIcon ? assetUrl(darkIcon) : ""
      }));
    }
    if (!l.iconOnly) {
      children.push(el("span", { class: "btn__text", text: l.label || "link" }));
    }

    wrap.appendChild(el("a", attrs, children));
  });
}

function updateThemeIcons() {
  const useDark = document.documentElement.classList.contains("theme-dark");
  document.querySelectorAll("img[data-icon-light]").forEach(img => {
    const light = img.getAttribute("data-icon-light");
    const dark = img.getAttribute("data-icon-dark");
    if (useDark && dark) img.src = dark;
    if (!useDark && light) img.src = light;
  });
}
window.updateThemeIcons = updateThemeIcons;

function renderBlock(title, paragraphs = [], bullets = null, opts = {}) {
  const block = el("section", { class: "block" });
  if (opts.id) block.id = opts.id;
  const headingTag = opts.headingTag || "h2";
  if (title) block.appendChild(el(headingTag, { text: title }));

  const paraEls = [];
  const inlineFigures = Array.isArray(opts.inlineFigures) ? opts.inlineFigures : null;
  const inlineMap = new Map();
  if (inlineFigures) {
    inlineFigures.forEach(entry => {
      if (!entry || typeof entry.afterParagraph !== "number" || !entry.figure) return;
      if (!inlineMap.has(entry.afterParagraph)) inlineMap.set(entry.afterParagraph, []);
      inlineMap.get(entry.afterParagraph).push(entry.figure);
    });
  }
  paragraphs.filter(Boolean).forEach((p, idx) => {
    const useHtml = typeof p === "string" && (p.includes("<strong>") || p.includes("<a "));
    const node = el("p", useHtml ? { html: p } : { text: p });
    paraEls.push(node);
    block.appendChild(node);
    if (inlineMap.has(idx)) {
      inlineMap.get(idx).forEach(fig => {
        const figNode = renderFigure(fig);
        if (figNode) block.appendChild(figNode);
      });
    }
  });

  if (opts.lede && paraEls.length) {
    paraEls[0].classList.add("lede", "dropcap");
  }

  if (Array.isArray(bullets) && bullets.length) {
    const ul = el("ul");
    bullets.forEach(b => ul.appendChild(el("li", { text: b })));
    block.appendChild(ul);
  }

  if (opts.callout && opts.callout.text) {
    const callout = el("div", { class: "callout" });
    if (opts.callout.label) {
      callout.appendChild(el("div", { class: "callout__label", text: opts.callout.label }));
    }
    callout.appendChild(el("p", { text: opts.callout.text }));
    block.appendChild(callout);
  }

  return block;
}

function typesetMath(root) {
  if (!root || typeof window.renderMathInElement !== "function") return;
  window.renderMathInElement(root, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false }
    ],
    throwOnError: false
  });
}

function assetUrl(src) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const clean = src.replace(/^\//, "");
  return getBasePath() + clean;
}

function startRandomOverlay(node, opts = {}) {
  if (!node || typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(max-width: 900px)").matches) return;

  const padding = Number(opts.padding) || 24;
  const minDuration = Number(opts.minDuration) || 10;
  const maxDuration = Number(opts.maxDuration) || 18;

  const move = () => {
    const rect = node.getBoundingClientRect();
    const maxX = Math.max(0, window.innerWidth - rect.width - padding);
    const maxY = Math.max(0, window.innerHeight - rect.height - padding);
    const x = padding + Math.random() * maxX;
    const y = padding + Math.random() * maxY;
    const duration = minDuration + Math.random() * (maxDuration - minDuration);
    node.style.transition = `transform ${duration}s linear`;
    node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };

  node.addEventListener("transitionend", move);
  window.addEventListener("resize", move);
  move();
}

let galleryIdCounter = 0;
const pagerAutoRegistry = (() => {
  if (typeof window === "undefined") return new Map();
  if (!window.__pagerAutoRegistry) window.__pagerAutoRegistry = new Map();
  return window.__pagerAutoRegistry;
})();

function renderFigure(fig) {
  if (!fig) return null;
  let media = null;
  if (Array.isArray(fig.pager) && fig.pager.length) {
    let currentIndex = 0;
    let autoTimer = null;
    const first = fig.pager[0];
    const pagerId = `pager-${galleryIdCounter++}`;
    const img = el("img", {
      src: assetUrl(first.src),
      alt: first.alt || fig.caption || "Project figure",
      loading: "lazy",
      class: "pager__img",
      "data-pager-id": pagerId
    });
    const frame = el("div", { class: "pager__frame" }, [img]);
    const updateImage = (index) => {
      const item = fig.pager[index];
      if (!item?.src) return;
      img.classList.remove("is-slide");
      void img.offsetWidth;
      img.src = assetUrl(item.src);
      img.alt = item.alt || fig.caption || "Project figure";
      img.classList.add("is-slide");
    };
    const goPrev = () => {
      currentIndex = (currentIndex - 1 + fig.pager.length) % fig.pager.length;
      updateImage(currentIndex);
    };
    const goNext = () => {
      currentIndex = (currentIndex + 1) % fig.pager.length;
      updateImage(currentIndex);
    };
    if (fig.autoCycle) {
      const intervalMs = Number(fig.autoCycle) || 5000;
      const startAuto = () => {
        if (autoTimer) return;
        autoTimer = setInterval(goNext, intervalMs);
      };
      const stopAuto = () => {
        if (!autoTimer) return;
        clearInterval(autoTimer);
        autoTimer = null;
      };
      startAuto();
      pagerAutoRegistry.set(pagerId, { pause: stopAuto, resume: startAuto });
    }
    media = frame;
  } else if (Array.isArray(fig.gallery) && fig.gallery.length) {
    const trackId = `proj-gallery-${galleryIdCounter++}`;
    const trackAttrs = { class: "gallery__track" };
    if (fig.controls) trackAttrs.id = trackId;
    const track = el("div", trackAttrs);
    fig.gallery.forEach(i => {
      if (!i?.src) return;
      track.appendChild(el("img", {
        src: assetUrl(i.src),
        alt: i.alt || fig.caption || "Project figure",
        loading: "lazy"
      }));
    });
    const galleryWrap = el("div", { class: "gallery" }, [track]);
    media = galleryWrap;
  } else if (Array.isArray(fig.images) && fig.images.length) {
    const gridAttrs = { class: "figure__grid" };
    if (fig.columns) gridAttrs.style = `--figure-columns: ${fig.columns};`;
    const grid = el("div", gridAttrs);
    fig.images.forEach(i => {
      if (!i?.src) return;
      grid.appendChild(el("img", {
        src: assetUrl(i.src),
        alt: i.alt || fig.caption || "Project figure",
        loading: "lazy"
      }));
    });
    media = grid;
  } else if (fig.src) {
    media = el("img", {
      src: assetUrl(fig.src),
      alt: fig.alt || fig.caption || "Project figure",
      loading: "lazy"
    });
  } else {
    return null;
  }
  const children = [media];
  if (fig.caption) children.push(el("figcaption", { text: fig.caption }));
  const classes = ["figure"];
  if (fig.wide) classes.push("figure--wide");
  if (fig.noBorder) classes.push("figure--no-border");
  if (Array.isArray(fig.gallery) && fig.gallery.length === 1) classes.push("figure--gallery-single");
  const attrs = { class: classes.join(" ") };
  if (typeof fig.scale === "number" && fig.scale > 0 && fig.scale !== 1) {
    attrs.style = `width: ${Math.round(fig.scale * 100)}%; margin-left: auto; margin-right: auto;`;
  }
  return el("figure", attrs, children);
}

function renderFigures(figures) {
  if (!Array.isArray(figures) || !figures.length) return null;
  const wrap = el("div", { class: "figures" });
  figures.map(renderFigure).filter(Boolean).forEach(node => wrap.appendChild(node));
  return wrap;
}

function renderTable(table) {
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) return null;
  const wrap = el("div", { class: "table" });

  const t = el("table");
  const thead = el("thead");
  const headRow = el("tr");
  table.columns.forEach(c => headRow.appendChild(el("th", { text: c })));
  thead.appendChild(headRow);
  t.appendChild(thead);

  const tbody = el("tbody");
  table.rows.forEach(r => {
    const row = el("tr");
    r.forEach(cell => row.appendChild(el("td", { text: String(cell) })));
    tbody.appendChild(row);
  });
  t.appendChild(tbody);
  wrap.appendChild(t);
  if (table.title) wrap.appendChild(el("div", { class: "table__caption", text: table.title }));
  return wrap;
}

function renderTables(tables) {
  if (!Array.isArray(tables) || !tables.length) return null;
  const wrap = el("div", { class: "tables" });
  tables.map(renderTable).filter(Boolean).forEach(node => wrap.appendChild(node));
  return wrap;
}

function renderBlockWithFigures(title, paragraphs = [], bullets = null, figures = null, tables = null, opts = {}) {
  const block = renderBlock(title, paragraphs, bullets, opts);
  const inlineAfterParagraphFigures = Array.isArray(opts.inlineAfterParagraphFigures)
    ? opts.inlineAfterParagraphFigures
    : null;
  const afterParaMap = new Map();
  if (inlineAfterParagraphFigures) {
    inlineAfterParagraphFigures.forEach(entry => {
      if (!entry || typeof entry.afterParagraph !== "number" || !entry.figure) return;
      if (!afterParaMap.has(entry.afterParagraph)) afterParaMap.set(entry.afterParagraph, []);
      afterParaMap.get(entry.afterParagraph).push(entry.figure);
    });
  }

  if (Array.isArray(opts.inlineFigures) && opts.inlineFigures.length) {
    if (opts.tablesBeforeFigures) {
      const tbls = renderTables(tables);
      if (tbls) block.appendChild(tbls);
    }
    if (Array.isArray(opts.afterTableParagraphs) && opts.afterTableParagraphs.length) {
      opts.afterTableParagraphs.filter(Boolean).forEach(p => {
        block.appendChild(el("p", { text: p }));
      });
    }
    if (Array.isArray(opts.afterParagraphs) && opts.afterParagraphs.length) {
      opts.afterParagraphs.filter(Boolean).forEach(p => {
        block.appendChild(el("p", { text: p }));
      });
    }
    if (!opts.tablesBeforeFigures) {
      const tbls = renderTables(tables);
      if (tbls) block.appendChild(tbls);
    }
    return block;
  }

  if (opts.tablesBeforeFigures) {
    const tbls = renderTables(tables);
    if (tbls) block.appendChild(tbls);
  }
  if (Array.isArray(opts.afterTableParagraphs) && opts.afterTableParagraphs.length) {
    opts.afterTableParagraphs.filter(Boolean).forEach(p => {
      block.appendChild(el("p", { text: p }));
    });
  }
  const figs = renderFigures(figures);
  if (figs) block.appendChild(figs);

  if (Array.isArray(opts.afterParagraphs) && opts.afterParagraphs.length) {
    opts.afterParagraphs.filter(Boolean).forEach((p, idx) => {
      block.appendChild(el("p", { text: p }));
      if (afterParaMap.has(idx)) {
        afterParaMap.get(idx).forEach(fig => {
          const figNode = renderFigure(fig);
          if (figNode) block.appendChild(figNode);
        });
      }
    });
  }

  if (!opts.tablesBeforeFigures) {
    const tbls = renderTables(tables);
    if (tbls) block.appendChild(tbls);
  }
  return block;
}

function initTocHighlight(sectionIds) {
  if (!sectionIds?.length) return;
  const tocLinks = new Map();
  sectionIds.forEach(id => {
    const link = document.querySelector(`#proj-toc a[href="#${id}"]`);
    if (link) tocLinks.set(id, link);
  });
  if (!tocLinks.size) return;

  const setCurrent = id => {
    const link = tocLinks.get(id);
    if (!link) return;
    tocLinks.forEach(l => l.classList.remove("is-current"));
    link.classList.add("is-current");
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute("id");
      if (entry.isIntersecting) {
        setCurrent(id);
      }
    });
  }, { rootMargin: "-20% 0px -60% 0px", threshold: 0.01 });

  sectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  const lastId = sectionIds[sectionIds.length - 1];
  const onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportBottom = scrollTop + window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    if (docHeight - viewportBottom <= 2) {
      setCurrent(lastId);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}

async function initProjectPage() {
  const titleEl = document.getElementById("proj-title");
  if (!titleEl) return;

  const slug = getParam("slug");
  let view = (getParam("view") || "glance").toLowerCase();

  const p = await loadProject(slug);

  if (!p) {
    titleEl.textContent = "Project not found";
    const body = document.getElementById("proj-body");
    body.innerHTML = "";
    body.appendChild(renderBlock("Missing slug", [
      "This project slug doesn’t exist in assets/data/projects/ or the file is missing.",
      "Go back to Projects and pick one from the list."
    ]));
    return;
  }

  // Head
  document.title = `${p.title} | Project`;
  document.getElementById("proj-kicker").textContent = p.kicker || "project";
  titleEl.textContent = p.title || "Untitled";
  const subtitleEl = document.getElementById("proj-subtitle");
  subtitleEl.textContent = p.subtitle || p.summary || "";
  subtitleEl.parentElement?.querySelectorAll(".hero-credit").forEach(node => node.remove());
  subtitleEl.parentElement?.querySelectorAll(".hero-authors").forEach(node => node.remove());
  let heroCredit = null;
  if (p.heroOverlay?.creditText && p.heroOverlay?.creditHref) {
    heroCredit = el("div", { class: "hero-credit" }, [
      el("a", {
        href: p.heroOverlay.creditHref,
        target: "_blank",
        rel: "noreferrer",
        text: p.heroOverlay.creditText
      })
    ]);
    subtitleEl.insertAdjacentElement("afterend", heroCredit);
  }
  if (Array.isArray(p.authors) && p.authors.length) {
    const authorText = `With ${p.authors.join(", ")}`;
    const authorEl = el("p", { class: "muted hero-authors", text: authorText });
    if (heroCredit) {
      heroCredit.insertAdjacentElement("afterend", authorEl);
    } else {
      subtitleEl.insertAdjacentElement("afterend", authorEl);
    }
  }

  const hero = document.querySelector(".article-hero");
  if (hero) {
    hero.querySelectorAll(".hero-overlay").forEach(node => node.remove());
    if (p.heroOverlay?.src) {
      const useDark = document.documentElement.classList.contains("theme-dark");
      const overlaySrc = (!useDark && p.heroOverlay.srcDark) ? p.heroOverlay.srcDark : p.heroOverlay.src;
      const overlayImg = el("img", {
        src: assetUrl(overlaySrc),
        alt: p.heroOverlay.alt || ""
      });
      const overlayClasses = ["hero-overlay"];
      if (p.heroOverlay.animate) overlayClasses.push("hero-overlay--walk");
      if (p.heroOverlay.speed === "fast") overlayClasses.push("hero-overlay--fast");
      if (p.heroOverlay.motion === "random") overlayClasses.push("hero-overlay--drone");
      const overlay = el("figure", { class: overlayClasses.join(" ") }, [overlayImg]);
      hero.appendChild(overlay);
      if (p.heroOverlay.motion === "random") {
        startRandomOverlay(overlay, p.heroOverlay.motionOptions || {});
      } else if (p.heroOverlay.animate) {
        overlay.addEventListener("animationend", () => {
          overlay.classList.add("hero-overlay--loop");
        }, { once: true });
      }
    }
  }

  const tagsMount = document.getElementById("proj-tags");
  tagsMount.innerHTML = "";
  const tagSet = new Set([...(p.mainTags || []), ...(p.tags || [])]);
  tagSet.forEach(t => tagsMount.appendChild(el("span", { class: "chip", text: t })));
  (p.tech || []).forEach(t => tagsMount.appendChild(el("span", { class: "chip", text: t })));

  // Toggle buttons
  const btnGlance = document.getElementById("btn-glance");
  const btnDeep = document.getElementById("btn-deep");
  btnGlance.href = projectUrl(p.slug, "glance");
  btnDeep.href = projectUrl(p.slug, "deep");
  const setActiveToggle = (nextView) => {
    if (nextView === "glance") {
      btnGlance.classList.remove("btn--ghost");
      btnGlance.classList.add("is-active");
      btnGlance.setAttribute("aria-current", "page");
      btnDeep.classList.add("btn--ghost");
      btnDeep.classList.remove("is-active");
      btnDeep.removeAttribute("aria-current");
    } else {
      btnDeep.classList.remove("btn--ghost");
      btnDeep.classList.add("is-active");
      btnDeep.setAttribute("aria-current", "page");
      btnGlance.classList.add("btn--ghost");
      btnGlance.classList.remove("is-active");
      btnGlance.removeAttribute("aria-current");
    }
  };

  // Links row
  renderLinks(p.links || []);

  // Body
  const body = document.getElementById("proj-body");
  const hideFigures = Boolean(p.hideFigures);

  const renderView = (nextView) => {
    view = nextView;
    setActiveToggle(view);

    body.innerHTML = "";
    body.classList.remove("proj-body--glance", "proj-body--deep");
    body.classList.add(view === "glance" ? "proj-body--glance" : "proj-body--deep");

    const toc = document.getElementById("proj-toc");
    const aside = document.getElementById("proj-aside");
    const wrap = document.querySelector(".article-wrap");
    if (toc) toc.innerHTML = "";
    if (aside) aside.hidden = view !== "deep";
    if (wrap) wrap.classList.toggle("article-wrap--single", view === "glance");

    if (view === "glance") {
      const problemLines = [p.glance?.oneLiner, p.glance?.problem || p.summary].filter(Boolean);
      body.appendChild(renderBlockWithFigures("Problem statement", problemLines, null, hideFigures ? null : p.glance?.problemFigures || null, p.glance?.problemTables || null, { lede: true }));
      body.appendChild(renderBlockWithFigures("Approach", [p.glance?.approach || "" ], p.glance?.approachBullets || null, hideFigures ? null : p.glance?.approachFigures || null, p.glance?.approachTables || null));
      body.appendChild(renderBlockWithFigures("Results", [p.glance?.results || "" ], p.glance?.resultsBullets || null, hideFigures ? null : p.glance?.resultsFigures || null, p.glance?.resultsTables || null));

      if (p.glance?.takeaways?.length) {
        body.appendChild(renderBlockWithFigures("Key takeaways", [], p.glance.takeaways, hideFigures ? null : p.glance?.takeawayFigures || null, p.glance?.takeawayTables || null));
      }
    } else {
      const sectionIds = [];
      if (Array.isArray(p.deep?.sections) && p.deep.sections.length) {
        p.deep.sections.forEach((s, idx) => {
          const sectionId = s.title ? s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "";
          if (toc && s.title) toc.appendChild(el("a", { href: `#${sectionId}`, text: s.title }));
          if (sectionId) sectionIds.push(sectionId);
          body.appendChild(renderBlockWithFigures(
            s.title || "",
            s.paragraphs || [],
            s.bullets || null,
            hideFigures ? null : s.figures || null,
            s.tables || null,
            {
              id: sectionId || undefined,
              lede: idx === 0,
              callout: s.callout || null,
              afterParagraphs: s.afterParagraphs || null,
              afterTableParagraphs: s.afterTableParagraphs || null,
              tablesBeforeFigures: Boolean(s.tablesBeforeFigures),
              inlineFigures: s.inlineFigures || null,
              inlineAfterParagraphFigures: s.inlineAfterParagraphFigures || null
            }
          ));
        });
        body.appendChild(el("div", { class: "proj-body-spacer", "aria-hidden": "true" }));
        initTocHighlight(sectionIds);
      } else {
        body.appendChild(renderBlockWithFigures("Overview", [
          p.deep?.overview || p.subtitle || p.summary || ""
        ], null, hideFigures ? null : p.deep?.overviewFigures || null, p.deep?.overviewTables || null, { lede: true }));

        if (p.deep?.methods) body.appendChild(renderBlockWithFigures("Methods", [p.deep.methods], p.deep.methodsBullets || null, hideFigures ? null : p.deep?.methodsFigures || null, p.deep?.methodsTables || null));
        if (p.deep?.data) body.appendChild(renderBlockWithFigures("Data", [p.deep.data], p.deep.dataBullets || null, hideFigures ? null : p.deep?.dataFigures || null, p.deep?.dataTables || null));
        if (p.deep?.experiments) body.appendChild(renderBlockWithFigures("Experiments", [p.deep.experiments], p.deep.experimentsBullets || null, hideFigures ? null : p.deep?.experimentsFigures || null, p.deep?.experimentsTables || null));
        if (p.deep?.notes) body.appendChild(renderBlockWithFigures("Notes", [p.deep.notes], p.deep.notesBullets || null, hideFigures ? null : p.deep?.notesFigures || null, p.deep?.notesTables || null));

        if (p.deep?.futureWork?.length) body.appendChild(renderBlockWithFigures("Future work", [], p.deep.futureWork, hideFigures ? null : p.deep?.futureWorkFigures || null, p.deep?.futureWorkTables || null));
      }
    }
    typesetMath(body);
    if (typeof window.bindLightboxImages === "function") window.bindLightboxImages();
  };

  renderView(view);

  const swapView = (nextView) => {
    if (nextView === view) return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    history.replaceState({}, "", url.toString());
    renderView(nextView);
  };

  btnGlance.addEventListener("click", (event) => {
    event.preventDefault();
    swapView("glance");
  });
  btnDeep.addEventListener("click", (event) => {
    event.preventDefault();
    swapView("deep");
  });

}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initHomeProjects();
    await initProjectsIndex();
    await initProjectPage();
  } catch (err) {
    console.error(err);
    // Soft fail: show a helpful card if the mount exists.
    const mounts = ["featured-projects", "projects-grid", "proj-body"]
      .map(id => document.getElementById(id))
      .filter(Boolean);

    mounts.forEach(m => {
      m.innerHTML = "";
      m.appendChild(el("div", { class: "card card--wide" }, [
        el("h3", { text: "Load error" }),
        el("p", { class: "muted", text: "Could not load assets/data/projects/index.json or a project detail file. Check paths and GitHub Pages settings." })
      ]));
    });
  }
});
