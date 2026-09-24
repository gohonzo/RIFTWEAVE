(() => {
  "use strict";

  const releaseLoader = () => {
    const loader = document.getElementById("assetLoader");
    if (!loader) return;
    loader.classList.remove("active");
    loader.setAttribute("aria-hidden", "true");
    window.setTimeout(() => loader.remove(), 650);
  };

  // Never allow the splash screen to trap the player indefinitely.
  window.addEventListener("load", () => window.setTimeout(releaseLoader, 180), { once: true });
  window.addEventListener("error", releaseLoader);
  window.addEventListener("unhandledrejection", releaseLoader);
  window.setTimeout(releaseLoader, 2400);

  window.RIFTWEAVE_RELEASE_LOADER = releaseLoader;
})();