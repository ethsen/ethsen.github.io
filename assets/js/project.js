async function loadProjects() {
  const res = await fetch(getBasePath() + "assets/data/projects.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load projects.json");
  const data = await res.json();
  return Array.isArray(data.projects) ? data.projects : [];
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
  const base = getBasePath();
  const inProjectsDir = /\/projects\//.test(window.location.pathname);
  const prefix = inProjectsDir ? "" : "projects/";
  return `${base}${prefix}project.html?slug=${encodeURIComponent(slug)}&view=${encodeURIComponent(view)}`;
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

function renderBlock(title, paragraphs = [], bullets = null) {
  const block = el("div", { class: "block" });
  if (title) block.appendChild(el("h2", { text: title }));

  paragraphs.filter(Boolean).forEach(p => block.appendChild(el("p", { text: p })));

  if (Array.isArray(bullets) && bullets.length) {
    const ul = el("ul");
    bullets.forEach(b => ul.appendChild(el("li", { text: b })));
    block.appendChild(ul);
  }
  return block;
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
    btnDeep.classList.add("btn--ghost");
  } else {
    btnDeep.classList.remove("btn--ghost");
    btnGlance.classList.add("btn--ghost");
  }

  // Links row
  renderLinks(p.links || []);

  // Body
  const body = document.getElementById("proj-body");
  body.innerHTML = "";

  if (view === "glance") {
    body.appendChild(renderBlock("At-a-glance", [
      p.glance?.oneLiner || p.summary || "",
    ]));

    body.appendChild(renderBlock("Problem", [p.glance?.problem || "" ]));
    body.appendChild(renderBlock("Approach", [p.glance?.approach || "" ], p.glance?.approachBullets || null));
    body.appendChild(renderBlock("Results", [p.glance?.results || "" ], p.glance?.resultsBullets || null));

    if (p.glance?.takeaways?.length) {
      body.appendChild(renderBlock("Key takeaways", [], p.glance.takeaways));
    }
  } else {
    body.appendChild(renderBlock("In-depth", [
      p.deep?.overview || p.subtitle || p.summary || ""
    ]));

    if (p.deep?.methods) body.appendChild(renderBlock("Methods", [p.deep.methods], p.deep.methodsBullets || null));
    if (p.deep?.data) body.appendChild(renderBlock("Data", [p.deep.data], p.deep.dataBullets || null));
    if (p.deep?.experiments) body.appendChild(renderBlock("Experiments", [p.deep.experiments], p.deep.experimentsBullets || null));
    if (p.deep?.notes) body.appendChild(renderBlock("Notes", [p.deep.notes], p.deep.notesBullets || null));

    if (p.deep?.futureWork?.length) body.appendChild(renderBlock("Future work", [], p.deep.futureWork));
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
