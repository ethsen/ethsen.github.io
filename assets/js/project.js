let projectsIndexCachePromise = null;
const projectCache = new Map();
let heroBannerFadeCleanup = null;

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

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(str) {
  return String(str || "").replace(/<[^>]*>/g, "").trim();
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

function trackProjectAnalytics(project, view) {
  if (typeof window.gtag !== "function" || !project?.slug) return;
  const pagePath = `${window.location.pathname}${window.location.search}`;
  const pageTitle = document.title || `${project.title || "Project"} | Project`;
  window.gtag("event", "page_view", {
    page_title: pageTitle,
    page_location: window.location.href,
    page_path: pagePath
  });
  window.gtag("event", "project_view", {
    project_slug: project.slug,
    project_title: project.title || "Untitled",
    project_view_mode: view || "glance"
  });
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
  const blockAttrs = { class: "block" };
  if (opts.className) blockAttrs.class += ` ${opts.className}`;
  const block = el("section", blockAttrs);
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
  const inlineTables = Array.isArray(opts.inlineTables) ? opts.inlineTables : null;
  const tableMap = new Map();
  if (inlineTables) {
    inlineTables.forEach(entry => {
      if (!entry || typeof entry.afterParagraph !== "number" || !entry.table) return;
      if (!tableMap.has(entry.afterParagraph)) tableMap.set(entry.afterParagraph, []);
      tableMap.get(entry.afterParagraph).push(entry.table);
    });
  }
  const inlineQuotes = Array.isArray(opts.inlineQuotes) ? opts.inlineQuotes : null;
  const quoteMap = new Map();
  if (inlineQuotes) {
    inlineQuotes.forEach(entry => {
      if (!entry || typeof entry.afterParagraph !== "number") return;
      if (!entry.paragraphs && !entry.lines) return;
      if (!quoteMap.has(entry.afterParagraph)) quoteMap.set(entry.afterParagraph, []);
      quoteMap.get(entry.afterParagraph).push(entry);
    });
  }
  const inlineSubtitles = Array.isArray(opts.inlineSubtitles) ? opts.inlineSubtitles : null;
  const subtitleMap = new Map();
  if (inlineSubtitles) {
    inlineSubtitles.forEach(entry => {
      if (!entry || typeof entry.afterParagraph !== "number" || !entry.text) return;
      if (!subtitleMap.has(entry.afterParagraph)) subtitleMap.set(entry.afterParagraph, []);
      subtitleMap.get(entry.afterParagraph).push(entry);
    });
  }
  if (opts.figureRefs instanceof Map && quoteMap.size) {
    quoteMap.forEach(entries => {
      entries.forEach(entry => {
        entry.figureRefs = opts.figureRefs;
        entry.tableRefs = opts.tableRefs || null;
      });
    });
  }
  paragraphs.filter(Boolean).forEach((p, idx) => {
    const node = renderLinkedParagraph(p, opts.figureRefs || null, opts.tableRefs || null);
    paraEls.push(node);
    block.appendChild(node);
    if (inlineMap.has(idx)) {
      inlineMap.get(idx).forEach(fig => {
        const figNode = renderFigure(fig);
        if (figNode) block.appendChild(figNode);
      });
    }
    if (tableMap.has(idx)) {
      tableMap.get(idx).forEach(tbl => {
        const tblNode = renderTable(tbl);
        if (tblNode) block.appendChild(tblNode);
      });
    }
    if (quoteMap.has(idx)) {
      quoteMap.get(idx).forEach(quote => {
        const quoteNode = renderQuote(quote);
        if (quoteNode) block.appendChild(quoteNode);
      });
    }
    if (subtitleMap.has(idx)) {
      subtitleMap.get(idx).forEach(subtitle => {
        const subtitleNode = renderInlineSubtitle(subtitle);
        if (subtitleNode) block.appendChild(subtitleNode);
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

  bindInlineFootnotes(block, opts.footnotes || null);
  return block;
}

function renderLinkedParagraph(text, figureRefs = null, tableRefs = null) {
  const useHtml = typeof text === "string" && /<[^>]+>/.test(text);
  const node = el("p", useHtml ? { html: text } : { text: text });
  linkProjectReferences(node, figureRefs, tableRefs);
  return node;
}

function appendLinkedParagraphs(parent, paragraphs = [], figureRefs = null, tableRefs = null) {
  if (!parent || !Array.isArray(paragraphs) || !paragraphs.length) return;
  paragraphs.filter(Boolean).forEach(text => {
    parent.appendChild(renderLinkedParagraph(text, figureRefs, tableRefs));
  });
}

function renderInlineSubtitle(subtitle) {
  if (!subtitle?.text) return null;
  const useHtml = typeof subtitle.text === "string" && /<[^>]+>/.test(subtitle.text);
  return el(subtitle.tag || "h3", {
    class: "block__subtitle",
    ...(useHtml ? { html: subtitle.text } : { text: subtitle.text })
  });
}

function renderQuote(quote) {
  if (!quote) return null;
  const lines = Array.isArray(quote.paragraphs) ? quote.paragraphs : quote.lines;
  if (!Array.isArray(lines) || !lines.length) return null;

  const classes = ["proj-quote"];
  if (quote.variant === "questions") classes.push("proj-quote--questions");
  else if (quote.variant === "plain") classes.push("proj-quote--plain");
  else classes.push("proj-quote--thought");
  if (quote.compact) classes.push("proj-quote--compact");
  const attrs = { class: classes.join(" ") };
  if (quote.variant !== "plain" && quote.variant !== "questions") {
    attrs.style = [
      `--quote-orb-x: ${12 + Math.round(Math.random() * 72)}%`,
      `--quote-orb-y: ${12 + Math.round(Math.random() * 68)}%`,
      `--quote-orb2-x: ${10 + Math.round(Math.random() * 74)}%`,
      `--quote-orb2-y: ${10 + Math.round(Math.random() * 72)}%`,
      `--quote-angle: ${120 + Math.round(Math.random() * 60)}deg`
    ].join("; ");
  }
  const node = el("blockquote", attrs);
  lines.filter(Boolean).forEach(line => {
    const useHtml = typeof line === "string" && /<[^>]+>/.test(line);
    const p = el("p", useHtml ? { html: line } : { text: line });
    linkProjectReferences(p, quote.figureRefs || null, quote.tableRefs || null);
    node.appendChild(p);
  });
  return node;
}

function getFigurePreviewSrc(fig) {
  if (!fig) return null;
  if (fig.previewSrc) return fig.previewSrc;
  if (fig.src) return fig.src;
  if (Array.isArray(fig.images) && fig.images[0]?.src) return fig.images[0].src;
  if (Array.isArray(fig.gallery) && fig.gallery[0]?.src) return fig.gallery[0].src;
  if (Array.isArray(fig.pager) && fig.pager[0]?.src) return fig.pager[0].src;
  return null;
}

function getFigureMeta(fig) {
  if (!fig) return { id: null, refLabel: null };
  if (fig.id || fig.refLabel) {
    return {
      id: fig.id || (fig.refLabel ? slugify(fig.refLabel) : null),
      refLabel: fig.refLabel || null
    };
  }
  const caption = stripHtml(fig.caption || "");
  const match = caption.match(/^(Figure\s+[A-Za-z0-9IVXLCM]+(?:[–-][A-Za-z0-9IVXLCM]+)?)/i);
  if (!match) return { id: null, refLabel: null };
  const refLabel = match[1].replace(/\s+/g, " ").trim();
  return {
    id: slugify(refLabel),
    refLabel
  };
}

function getTableMeta(table) {
  if (!table) return { id: null, refLabel: null };
  if (table.id || table.refLabel) {
    return {
      id: table.id || (table.refLabel ? slugify(table.refLabel) : null),
      refLabel: table.refLabel || null
    };
  }
  const title = stripHtml(table.title || "");
  const match = title.match(/^(Table\s+[A-Za-z0-9IVXLCM]+(?:[–-][A-Za-z0-9IVXLCM]+)?)/i);
  if (!match) return { id: null, refLabel: null };
  const refLabel = match[1].replace(/\s+/g, " ").trim();
  return {
    id: slugify(refLabel),
    refLabel
  };
}

function getFigurePreviewItems(fig) {
  if (!fig) return [];
  if (Array.isArray(fig.images) && fig.images.length) {
    return fig.images
      .filter(item => item?.src)
      .map(item => ({ src: assetUrl(item.src), alt: item.alt || fig.caption || "Project figure" }));
  }
  const single = getFigurePreviewSrc(fig);
  if (!single) return [];
  return [{ src: assetUrl(single), alt: fig.alt || fig.caption || "Project figure" }];
}

function collectFigureRefs(figures = []) {
  const refs = new Map();
  figures.filter(Boolean).forEach(fig => {
    const meta = getFigureMeta(fig);
    if (!meta.id || !meta.refLabel) return;
    const previewSrc = getFigurePreviewSrc(fig);
    refs.set(meta.refLabel, {
      id: meta.id,
      label: meta.refLabel,
      previewSrc: previewSrc ? assetUrl(previewSrc) : null,
      previewItems: getFigurePreviewItems(fig),
      previewAlt: fig.alt || fig.caption || meta.refLabel
    });
  });
  return refs;
}

function collectTableRefs(tables = []) {
  const refs = new Map();
  tables.filter(Boolean).forEach(table => {
    const meta = getTableMeta(table);
    if (!meta.id || !meta.refLabel) return;
    refs.set(meta.refLabel, {
      id: meta.id,
      label: meta.refLabel
    });
  });
  return refs;
}

function collectBlockFigureEntries(figures = null, opts = {}) {
  const entries = [];
  if (Array.isArray(figures)) entries.push(...figures);
  if (Array.isArray(opts.inlineFigures)) {
    opts.inlineFigures.forEach(entry => {
      if (entry?.figure) entries.push(entry.figure);
    });
  }
  return entries;
}

function renderFigurePreviewHtml(ref, suffix = "") {
  const items = Array.isArray(ref.previewItems) ? ref.previewItems : [];
  if (!items.length) return "";
  const suffixMatch = /^\(([a-z])\)$/.exec(suffix || "");
  if (suffixMatch) {
    const idx = suffixMatch[1].charCodeAt(0) - 97;
    const item = items[idx] || items[0];
    return `<span class="figure-ref__preview" aria-hidden="true"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || "")}"></span>`;
  }
  if (items.length === 1) {
    const item = items[0];
    return `<span class="figure-ref__preview" aria-hidden="true"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || "")}"></span>`;
  }
  const imgs = items.map(item => `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || "")}">`).join("");
  return `<span class="figure-ref__preview figure-ref__preview--grid" aria-hidden="true"><span class="figure-ref__preview-grid">${imgs}</span></span>`;
}

function linkFigureReferences(node, figureRefs) {
  if (!node || !(figureRefs instanceof Map) || !figureRefs.size) return;
  let html = node.innerHTML;
  const labels = [...figureRefs.keys()].sort((a, b) => b.length - a.length);
  labels.forEach(label => {
    const ref = figureRefs.get(label);
    const re = new RegExp(`(${escapeRegExp(label)})(?![A-Z0-9])(\\([a-z]\\))?`, "g");
    html = html.replace(re, (_m, base, suffix = "") => {
      const shown = `${base}${suffix}`;
      const preview = renderFigurePreviewHtml(ref, suffix);
      return `<a class="doc-ref figure-ref" href="#${ref.id}" data-figure-ref="${base}"><span class="figure-ref__label">${shown}</span>${preview}</a>`;
    });
  });
  node.innerHTML = html;
}

function linkTableReferences(node, tableRefs) {
  if (!node || !(tableRefs instanceof Map) || !tableRefs.size) return;
  let html = node.innerHTML;
  const labels = [...tableRefs.keys()].sort((a, b) => b.length - a.length);
  labels.forEach(label => {
    const ref = tableRefs.get(label);
    const re = new RegExp(`(${escapeRegExp(label)})(?![A-Z0-9])(\\([a-z]\\))?`, "g");
    html = html.replace(re, (_m, base, suffix = "") => {
      const shown = `${base}${suffix}`;
      return `<a class="doc-ref table-ref" href="#${ref.id}" data-table-ref="${base}">${shown}</a>`;
    });
  });
  node.innerHTML = html;
}

function linkProjectReferences(node, figureRefs, tableRefs) {
  linkFigureReferences(node, figureRefs);
  linkTableReferences(node, tableRefs);
}

function collectBlockTableEntries(tables = null, opts = {}) {
  const entries = [];
  if (Array.isArray(tables)) entries.push(...tables);
  if (Array.isArray(opts.inlineTables)) {
    opts.inlineTables.forEach(entry => {
      if (entry?.table) entries.push(entry.table);
    });
  }
  return entries;
}

function bindHeroBannerFade(hero, banner) {
  if (typeof heroBannerFadeCleanup === "function") {
    heroBannerFadeCleanup();
    heroBannerFadeCleanup = null;
  }
  if (!hero || !banner || typeof window === "undefined") return;

  let rafId = 0;
  const update = () => {
    rafId = 0;
    const rect = hero.getBoundingClientRect();
    const fadeDistance = Math.max(220, Math.min(420, rect.height * 0.75));
    const progress = Math.max(0, Math.min(1, -rect.top / fadeDistance));
    const isHeroStrong = banner.classList.contains("hero-banner-figure--strong");
    const startOpacity = isHeroStrong ? 0.76 : 0.56;
    const endOpacity = isHeroStrong ? 0.00 : 0.10;
    const opacity = startOpacity - progress * (startOpacity - endOpacity);
    const translateY = progress * 18;
    banner.style.opacity = String(Math.max(endOpacity, opacity));
    banner.style.transform = `translateX(-50%) translateY(${translateY}px)`;
  };

  const requestUpdate = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  requestUpdate();

  heroBannerFadeCleanup = () => {
    window.removeEventListener("scroll", requestUpdate);
    window.removeEventListener("resize", requestUpdate);
    if (rafId) window.cancelAnimationFrame(rafId);
  };
}

function bindInlineFootnotes(block, footnotes) {
  if (!block || !Array.isArray(footnotes) || !footnotes.length) return;
  const footnoteMap = new Map(
    footnotes.map(note => [String(note.number), Array.isArray(note.paragraphs) ? note.paragraphs.join(" ") : (note.text || "")])
  );

  block.querySelectorAll(".fn-ref").forEach(ref => {
    const key = (ref.textContent || "").trim();
    const text = footnoteMap.get(key);
    if (!text) return;
    ref.setAttribute("data-footnote", text);
    ref.setAttribute("tabindex", "0");
    ref.setAttribute("role", "note");
    ref.setAttribute("aria-label", `Footnote ${key}: ${text}`);
  });
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
    const frameClasses = ["pager__frame"];
    const frameAttrs = {};
    if (fig.frameAspect) {
      frameClasses.push("pager__frame--fixed");
      frameAttrs.style = `--pager-aspect: ${fig.frameAspect};`;
    }
    frameAttrs.class = frameClasses.join(" ");
    const frame = el("div", frameAttrs, [img]);
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
      const img = el("img", {
        src: assetUrl(i.src),
        alt: i.alt || fig.caption || "Project figure",
        loading: "lazy"
      });
      if (i.caption) {
        const useHtmlSubcaption = typeof i.caption === "string" && /<[^>]+>/.test(i.caption);
        grid.appendChild(el("figure", { class: "figure__grid-item" }, [
          img,
          el("figcaption", useHtmlSubcaption ? { html: i.caption } : { text: i.caption })
        ]));
      } else {
        grid.appendChild(img);
      }
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
  if (fig.caption) {
    const useHtmlCaption = typeof fig.caption === "string" && /<[^>]+>/.test(fig.caption);
    children.push(el("figcaption", useHtmlCaption ? { html: fig.caption } : { text: fig.caption }));
  }
  const classes = ["figure"];
  if (fig.wide) classes.push("figure--wide");
  if (fig.noBorder) classes.push("figure--no-border");
  if (Array.isArray(fig.gallery) && fig.gallery.length === 1) classes.push("figure--gallery-single");
  const attrs = { class: classes.join(" ") };
  const meta = getFigureMeta(fig);
  if (meta.id) attrs.id = meta.id;
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
  const wrapClasses = ["table"];
  if (table.wide) wrapClasses.push("table--wide");
  if (table.compact) wrapClasses.push("table--compact");
  const wrap = el("div", { class: wrapClasses.join(" ") });
  const meta = getTableMeta(table);
  if (meta.id) wrap.id = meta.id;

  const t = el("table");
  const thead = el("thead");
  const headRow = el("tr");
  table.columns.forEach(c => headRow.appendChild(el("th", { text: c })));
  thead.appendChild(headRow);
  t.appendChild(thead);

  const tbody = el("tbody");
  table.rows.forEach(r => {
    if (Array.isArray(r)) {
      const row = el("tr");
      r.forEach(cell => row.appendChild(el("td", { text: String(cell) })));
      tbody.appendChild(row);
      return;
    }
    if (!r || typeof r !== "object") return;
    if (r.type === "section") {
      const sectionClasses = ["table__section"];
      if (r.tone) sectionClasses.push(`table__section--${r.tone}`);
      const row = el("tr", { class: sectionClasses.join(" ") });
      row.appendChild(el("td", {
        colspan: table.columns.length,
        html: r.label || ""
      }));
      tbody.appendChild(row);
      return;
    }
    if (!Array.isArray(r.cells)) return;
    const rowClasses = [];
    if (r.tone) rowClasses.push(`table__row--${r.tone}`);
    const row = el("tr", rowClasses.length ? { class: rowClasses.join(" ") } : {});
    r.cells.forEach(cell => {
      const isCellObj = cell && typeof cell === "object" && !Array.isArray(cell);
      const tag = isCellObj && cell.header ? "th" : "td";
      const attrs = {};
      const value = isCellObj ? (cell.html ?? cell.text ?? "") : cell;
      if (isCellObj && cell.className) attrs.class = cell.className;
      const useHtml = typeof value === "string" && /<[^>]+>/.test(value);
      row.appendChild(el(tag, useHtml ? { ...attrs, html: String(value) } : { ...attrs, text: String(value) }));
    });
    tbody.appendChild(row);
  });
  t.appendChild(tbody);
  wrap.appendChild(t);
  if (table.title) {
    const useHtmlTitle = typeof table.title === "string" && /<[^>]+>/.test(table.title);
    wrap.appendChild(el("div", { class: "table__caption" }, [
      el("span", useHtmlTitle ? { html: table.title } : { text: table.title })
    ]));
  }
  return wrap;
}

function renderTables(tables) {
  if (!Array.isArray(tables) || !tables.length) return null;
  const wrap = el("div", { class: "tables" });
  tables.map(renderTable).filter(Boolean).forEach(node => wrap.appendChild(node));
  return wrap;
}

function renderBlockWithFigures(title, paragraphs = [], bullets = null, figures = null, tables = null, opts = {}) {
  const figureRefEntries = collectBlockFigureEntries(figures, opts);
  const figureRefs = opts.figureRefs instanceof Map ? opts.figureRefs : collectFigureRefs(figureRefEntries);
  const tableRefEntries = collectBlockTableEntries(tables, opts);
  const tableRefs = opts.tableRefs instanceof Map ? opts.tableRefs : collectTableRefs(tableRefEntries);
  const block = renderBlock(title, paragraphs, bullets, {
    ...opts,
    figureRefs,
    tableRefs
  });

  if (opts.tablesBeforeFigures) {
    const tbls = renderTables(tables);
    if (tbls) block.appendChild(tbls);
  }
  appendLinkedParagraphs(block, opts.afterTableParagraphs || null, figureRefs, tableRefs);
  const figs = renderFigures(figures);
  if (figs) block.appendChild(figs);
  appendLinkedParagraphs(block, opts.afterParagraphs || null, figureRefs, tableRefs);

  if (!opts.tablesBeforeFigures) {
    const tbls = renderTables(tables);
    if (tbls) block.appendChild(tbls);
  }
  return block;
}

function initTocHighlight(sectionIds) {
  if (!sectionIds?.length) return;
  if (!sectionIds.length) return;
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

function collectViewFigureRefs(project, view) {
  if (!project) return new Map();
  const entries = [];

  if (view === "glance") {
    const glanceBlocks = [
      { figures: project.glance?.problemFigures },
      { figures: project.glance?.approachFigures },
      { figures: project.glance?.resultsFigures },
      { figures: project.glance?.takeawayFigures }
    ];
    glanceBlocks.forEach(block => {
      entries.push(...collectBlockFigureEntries(block.figures, block));
    });
    return collectFigureRefs(entries);
  }

  const deepSections = collectProjectSections(project);
  if (deepSections.length) {
    deepSections.forEach(section => {
      entries.push(...collectBlockFigureEntries(section.figures || null, {
        inlineFigures: section.inlineFigures || null
      }));
    });
    return collectFigureRefs(entries);
  }
  return collectFigureRefs(entries);
}

function collectViewTableRefs(project, view) {
  if (!project) return new Map();
  const entries = [];

  if (view === "glance") {
    const glanceBlocks = [
      { tables: project.glance?.problemTables },
      { tables: project.glance?.approachTables },
      { tables: project.glance?.resultsTables },
      { tables: project.glance?.takeawayTables }
    ];
    glanceBlocks.forEach(block => {
      entries.push(...collectBlockTableEntries(block.tables, block));
    });
    return collectTableRefs(entries);
  }

  const deepSections = collectProjectSections(project);
  if (deepSections.length) {
    deepSections.forEach(section => {
      entries.push(...collectBlockTableEntries(section.tables || null, {
        inlineTables: section.inlineTables || null
      }));
    });
    return collectTableRefs(entries);
  }
  return collectTableRefs(entries);
}

function collectProjectSections(project) {
  const sections = Array.isArray(project?.deep?.sections) ? [...project.deep.sections] : [];
  if (Array.isArray(project?.references) && project.references.length) {
    sections.push({
      title: "References",
      paragraphs: project.references
        .map(ref => ref?.html || ref?.text || "")
        .filter(Boolean)
    });
  }
  return sections;
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
    if (typeof heroBannerFadeCleanup === "function") {
      heroBannerFadeCleanup();
      heroBannerFadeCleanup = null;
    }
    hero.querySelectorAll(".hero-overlay").forEach(node => node.remove());
    hero.querySelectorAll(".hero-banner-figure").forEach(node => node.remove());
    hero.classList.toggle("article-hero--with-banner", Boolean(p.heroFigure?.src));
    document.body.classList.toggle("page-project--vae", p.slug === "variational-autoencoders");
    if (p.heroFigure?.src) {
      const heroFig = renderFigure({
        ...p.heroFigure,
        caption: null
      });
      if (heroFig) {
        heroFig.classList.add("hero-banner-figure");
        if (p.slug === "variational-autoencoders") {
          heroFig.classList.add("hero-banner-figure--strong");
        }
        hero.insertBefore(heroFig, hero.firstChild);
        bindHeroBannerFade(hero, heroFig);
      }
    }
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
        const loopDelay = p.heroOverlay.speed === "fast" ? 3500 : 7000;
        const loopTimer = window.setTimeout(() => {
          overlay.classList.add("hero-overlay--loop");
        }, loopDelay + 120);
        overlay.addEventListener("animationend", () => {
          window.clearTimeout(loopTimer);
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

  const renderView = (nextView) => {
    view = nextView;
    setActiveToggle(view);

    body.innerHTML = "";
    body.classList.remove("proj-body--glance", "proj-body--deep");
    body.classList.add(view === "glance" ? "proj-body--glance" : "proj-body--deep");

    const toc = document.getElementById("proj-toc");
    const aside = document.getElementById("proj-aside");
    const wrap = document.querySelector(".article-wrap");
    const deepSections = collectProjectSections(p);
    const viewFigureRefs = collectViewFigureRefs(p, view);
    const viewTableRefs = collectViewTableRefs(p, view);
    if (toc) toc.innerHTML = "";
    if (aside) aside.hidden = view !== "deep";
    if (wrap) wrap.classList.toggle("article-wrap--single", view === "glance");

    if (view === "glance") {
      const problemLines = [p.glance?.oneLiner, p.glance?.problem || p.summary].filter(Boolean);
      body.appendChild(renderBlockWithFigures("Problem statement", problemLines, null, p.glance?.problemFigures || null, p.glance?.problemTables || null, { lede: true, figureRefs: viewFigureRefs, tableRefs: viewTableRefs }));
      body.appendChild(renderBlockWithFigures("Approach", [p.glance?.approach || "" ], p.glance?.approachBullets || null, p.glance?.approachFigures || null, p.glance?.approachTables || null, { figureRefs: viewFigureRefs, tableRefs: viewTableRefs }));
      body.appendChild(renderBlockWithFigures("Results", [p.glance?.results || "" ], p.glance?.resultsBullets || null, p.glance?.resultsFigures || null, p.glance?.resultsTables || null, { figureRefs: viewFigureRefs, tableRefs: viewTableRefs }));

      if (p.glance?.takeaways?.length) {
        body.appendChild(renderBlockWithFigures("Key takeaways", [], p.glance.takeaways, p.glance?.takeawayFigures || null, p.glance?.takeawayTables || null, { figureRefs: viewFigureRefs, tableRefs: viewTableRefs }));
      }
    } else {
      const sectionIds = [];
      deepSections.forEach((s, idx) => {
        const sectionId = s.title ? s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "";
        if (toc && s.title) toc.appendChild(el("a", { href: `#${sectionId}`, text: s.title }));
        if (sectionId) sectionIds.push(sectionId);
        body.appendChild(renderBlockWithFigures(
          s.title || "",
          s.paragraphs || [],
          s.bullets || null,
          s.figures || null,
          s.tables || null,
          {
            id: sectionId || undefined,
            lede: idx === 0,
            figureRefs: viewFigureRefs,
            tableRefs: viewTableRefs,
            callout: s.callout || null,
            afterParagraphs: s.afterParagraphs || null,
            afterTableParagraphs: s.afterTableParagraphs || null,
            tablesBeforeFigures: Boolean(s.tablesBeforeFigures),
            inlineFigures: s.inlineFigures || null,
            inlineTables: s.inlineTables || null,
            footnotes: s.footnotes || null,
            inlineQuotes: s.inlineQuotes || null,
            inlineSubtitles: s.inlineSubtitles || null
          }
        ));
      });
      body.appendChild(el("div", { class: "proj-body-spacer", "aria-hidden": "true" }));
      initTocHighlight(sectionIds);
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
    trackProjectAnalytics(p, nextView);
  };

  btnGlance.addEventListener("click", (event) => {
    event.preventDefault();
    swapView("glance");
  });
  btnDeep.addEventListener("click", (event) => {
    event.preventDefault();
    swapView("deep");
  });

  trackProjectAnalytics(p, view);

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
