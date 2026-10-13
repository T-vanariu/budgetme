// Runs before first paint (loaded synchronously in <head>) so there is no flash of the wrong theme.
(function () {
  try {
    var t = localStorage.getItem('budgetme-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* storage blocked: fall back to light until the app loads */
  }
})();
