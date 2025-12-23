async function includeInto(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    el.innerHTML = await res.text();
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await includeInto("#site-nav", "/partials/nav.html");
  await includeInto("#site-footer", "/partials/footer.html");

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
