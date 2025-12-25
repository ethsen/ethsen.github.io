(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Add a tiny “boot” class for any future animation hooks.
  document.documentElement.classList.add("boot");
})();
