let projectsCachePromise = null;
async function loadProjects() {
  if (!projectsCachePromise) {
    projectsCachePromise = fetch(getBasePath() + "assets/data/projects.json", { cache: "no-store" })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load projects.json");
        return res.json();
      })
      .then(data => (Array.isArray(data.projects) ? data.projects : []));
  }
  return projectsCachePromise;
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

function renderProjectCard(p) {
  const featured = p.featured ? el("span", { class: "badge", text: "featured" }) : el("span", { class: "badge", text: p.year ? String(p.year) : "project" });

  const thumb = el("a", { class: "proj__thumb", href: projectUrl(p.slug, "glance") }, [
    el("img", { src: projectThumb(p), alt: p.title ? `Thumbnail for ${p.title}` : "Project thumbnail", loading: "lazy" })
  ]);

  const title = el("h3", { class: "proj__title" }, [
    el("a", { href: projectUrl(p.slug, "glance"), text: p.title || "Untitled" })
  ]);

  const desc = el("p", { class: "proj__desc", text: p.summary || "" });

  const top = el("div", { class: "proj__top" }, [title, featured]);

  const card = el("article", { class: "card proj" }, [
    thumb,
    top,
    desc
  ]);

  return card;
}

function uniqueTags(projects) {
  const set = new Set();
  projects.forEach(p => (p.tags || []).forEach(t => set.add(t)));
  return [...set].sort((a,b) => a.localeCompare(b));
}

/* ---------- Page initializers ---------- */

async function initHomeProjects() {
  const mount = document.getElementById("featured-projects");
  if (!mount) return;

  const search = document.getElementById("home-search");
  const tagSel = document.getElementById("home-tag");

  const projects = await loadProjects();

  if (tagSel) {
    uniqueTags(projects).forEach(t => tagSel.appendChild(el("option", { value: t, text: t })));
  }

  function apply() {
    const q = (search?.value || "").trim().toLowerCase();
    const tag = tagSel?.value || "";

    let out = [...projects];

    if (tag) out = out.filter(p => (p.tags || []).includes(tag));
    if (q) {
      out = out.filter(p => {
        const blob = [
          p.title, p.summary, p.subtitle,
          ...(p.tags || []),
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

  const projects = await loadProjects();

  // Populate tag dropdown
  uniqueTags(projects).forEach(t => tagSel.appendChild(el("option", { value: t, text: t })));

  function apply() {
    const q = (search.value || "").trim().toLowerCase();
    const tag = tagSel.value || "";
    const sort = sortSel.value;

    let out = [...projects];

    if (tag) out = out.filter(p => (p.tags || []).includes(tag));
    if (q) {
      out = out.filter(p => {
        const blob = [
          p.title, p.summary, p.subtitle,
          ...(p.tags || []),
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

function renderLinks(links) {
  const wrap = document.getElementById("proj-links");
  if (!wrap) return;

  wrap.innerHTML = "";
  (links || []).forEach(l => {
    const href = safeLink(l.href);
    if (!href) return;

    const isExternal = href.startsWith("https://");
    wrap.appendChild(
      el("a", {
        class: "btn btn--small " + (l.kind === "primary" ? "" : "btn--ghost"),
        href,
        target: isExternal ? "_blank" : "_self",
        rel: isExternal ? "noreferrer" : "",
        text: l.label || "link"
      })
    );
  });
}

function renderBlock(title, paragraphs = [], bullets = null, opts = {}) {
  const block = el("section", { class: "block" });
  if (opts.id) block.id = opts.id;
  const headingTag = opts.headingTag || "h2";
  if (title) block.appendChild(el(headingTag, { text: title }));

  const paraEls = [];
  paragraphs.filter(Boolean).forEach(p => {
    const node = el("p", { text: p });
    paraEls.push(node);
    block.appendChild(node);
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

function assetUrl(src) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const clean = src.replace(/^\//, "");
  return getBasePath() + clean;
}

function renderFigure(fig) {
  if (!fig) return null;
  let media = null;
  if (Array.isArray(fig.images) && fig.images.length) {
    const grid = el("div", { class: "figure__grid" });
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
  return el("figure", { class: "figure" }, children);
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
  const figs = renderFigures(figures);
  if (figs) block.appendChild(figs);
  const tbls = renderTables(tables);
  if (tbls) block.appendChild(tbls);
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

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute("id");
      const link = tocLinks.get(id);
      if (!link) return;
      if (entry.isIntersecting) {
        tocLinks.forEach(l => l.classList.remove("is-current"));
        link.classList.add("is-current");
      }
    });
  }, { rootMargin: "-20% 0px -60% 0px", threshold: 0.01 });

  sectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

async function initProjectPage() {
  const titleEl = document.getElementById("proj-title");
  if (!titleEl) return;

  const slug = getParam("slug");
  const view = (getParam("view") || "glance").toLowerCase();

  const projects = await loadProjects();
  const p = projects.find(x => x.slug === slug);

  if (!p) {
    titleEl.textContent = "Project not found";
    const body = document.getElementById("proj-body");
    body.innerHTML = "";
    body.appendChild(renderBlock("Missing slug", [
      "This project slug doesn’t exist in assets/data/projects.json.",
      "Go back to Projects and pick one from the list."
    ]));
    return;
  }

  // Head
  document.title = `${p.title} | Project`;
  document.getElementById("proj-kicker").textContent = p.kicker || "project";
  titleEl.textContent = p.title || "Untitled";
  document.getElementById("proj-subtitle").textContent = p.subtitle || p.summary || "";

  const tagsMount = document.getElementById("proj-tags");
  tagsMount.innerHTML = "";
  (p.tags || []).forEach(t => tagsMount.appendChild(el("span", { class: "chip", text: t })));
  (p.tech || []).forEach(t => tagsMount.appendChild(el("span", { class: "chip", text: t })));

  // Toggle buttons
  const btnGlance = document.getElementById("btn-glance");
  const btnDeep = document.getElementById("btn-deep");
  btnGlance.href = projectUrl(p.slug, "glance");
  btnDeep.href = projectUrl(p.slug, "deep");
  if (view === "glance") {
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

  // Links row
  renderLinks(p.links || []);

  // Body
  const body = document.getElementById("proj-body");
  body.innerHTML = "";
  body.classList.remove("proj-body--glance", "proj-body--deep");
  body.classList.add(view === "glance" ? "proj-body--glance" : "proj-body--deep");
  const hideFigures = Boolean(p.hideFigures);

  const toc = document.getElementById("proj-toc");
  const aside = document.getElementById("proj-aside");
  if (toc) toc.innerHTML = "";
  if (aside) aside.hidden = view !== "deep";

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
        if (toc && s.title) {
          toc.appendChild(el("a", { href: `#${sectionId}`, text: s.title }));
        }
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
            callout: s.callout || null
          }
        ));
      });
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
        el("p", { class: "muted", text: "Could not load assets/data/projects.json. Check paths and GitHub Pages settings." })
      ]));
    });
  }
});
