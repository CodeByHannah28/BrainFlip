const STORAGE_KEY = 'brainflip.theme';

function readSaved() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'dark' || value === 'light') {
      return value;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function writeSaved(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    return;
  }
}

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyTheme(theme, button) {
  document.documentElement.setAttribute('data-theme', theme);
  if (button) {
    let label = 'Switch to dark mode';
    if (theme === 'dark') {
      label = 'Switch to light mode';
    }
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
  }
}

export function setupTheme() {
  const button = document.getElementById('theme-toggle');
  let theme = readSaved() || getSystemTheme();
  applyTheme(theme, button);

  if (button) {
    button.addEventListener('click', function () {
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        theme = 'light';
      } else {
        theme = 'dark';
      }
      writeSaved(theme);
      applyTheme(theme, button);
    });
  }

  if (window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', function (event) {
      if (!readSaved()) {
        applyTheme(event.matches ? 'dark' : 'light', button);
      }
    });
  }
}