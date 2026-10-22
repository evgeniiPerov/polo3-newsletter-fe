'use strict';
// Blocking classic script in <head>, before the stylesheet: the stored theme is set before first paint, so no flash.
(() => {
  const THEME_STORAGE_KEY = 'polo3-theme';
  const THEMES = ['light', 'dark'];
  const root = document.documentElement;

  // Private mode or blocked storage throws: null means "no choice stored", so the system scheme applies.
  function readStoredTheme() {
    try {
      const theme = localStorage.getItem(THEME_STORAGE_KEY);
      return THEMES.includes(theme) ? theme : null;
    } catch {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Blocked storage: the toggle still works for this visit, the choice just is not remembered.
      return;
    }
  }

  const effectiveTheme = () =>
    root.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  // The button label is CSS-driven (both labels are in the HTML), so the script only flips and stores the theme.
  function poloThemeToggle(button) {
    button.addEventListener('click', () => {
      const theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = theme;
      storeTheme(theme);
    });
  }

  const storedTheme = readStoredTheme();
  if (storedTheme) root.dataset.theme = storedTheme;

  const wireToggles = () => document.querySelectorAll('.js-theme-toggle').forEach(poloThemeToggle);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireToggles);
  else wireToggles();
})();
