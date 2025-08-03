// Load header
fetch('/components/header.html')
  .then(res => res.text())
  .then(headerText => {
    const headerEl = document.getElementById("header-placeholder");
    if (!headerEl) return;

    headerEl.innerHTML = headerText;

    // Wait until DOM is updated before injecting the title
    requestAnimationFrame(() => {
      if (typeof injectPageTitle !== "undefined") {
        const titleContainer = headerEl.querySelector('#page-title');
        if (titleContainer) {
          titleContainer.innerHTML = `<h1>${injectPageTitle}</h1>`;
          titleContainer.classList.remove("hidden");
        }
      }
    });
  })
  .catch(err => {
    console.error("Failed to load header:", err);
  });

// Load footer
fetch('/components/footer.html')
  .then(res => res.text())
  .then(footerText => {
    const footerEl = document.getElementById("footer-placeholder");
    if (!footerEl) return;

    footerEl.innerHTML = footerText;
  })
  .catch(err => {
    console.error("Failed to load footer:", err);
  });
