function readAppThemeFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('appSettings') || '{}');
  } catch {
    return {};
  }
}

/** Apply per-project theme overrides (CSS variables). */
export function applyProjectTheme(settings) {
  const root = document.documentElement;
  if (!settings?.themeOverride) {
    clearProjectTheme();
    return;
  }

  const primary = settings.primaryColor || '#1890ff';
  const accent = settings.accentColor || '#52c41a';

  root.style.setProperty('--primary-color', primary);
  root.style.setProperty('--accent-color', accent);
  root.style.setProperty('--layout-sidebar-color', primary);
  root.style.setProperty('--layout-header-color', primary);
  document.body.classList.add('project-theme-active');
}

/** Restore global app theme variables. */
export function clearProjectTheme() {
  const appSettings = readAppThemeFromStorage();
  const root = document.documentElement;

  root.style.removeProperty('--layout-sidebar-color');
  root.style.removeProperty('--layout-header-color');
  root.style.removeProperty('--accent-color');
  root.style.setProperty(
    '--primary-color',
    appSettings.primaryColor || '#1890ff',
  );
  document.body.classList.remove('project-theme-active');
}
