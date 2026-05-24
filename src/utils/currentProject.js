const PROJECT_ROUTE_RE =
  /^\/(projectPage|sheets|charts|docs|projectSettings|game|git)\/([^/?#]+)/;

export function getRoutePath() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return hash.split('?')[0];
}

export function projectNameFromRoute(route = getRoutePath()) {
  const match = route.match(PROJECT_ROUTE_RE);
  if (!match) return null;
  const raw = match[2];
  try {
    return decodeURIComponent(raw.replace(/[@]/g, '/'));
  } catch {
    return raw.replace(/[@]/g, '/');
  }
}

export function normalizeProjectName(name) {
  if (!name) return null;
  const trimmed = String(name).trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  return trimmed;
}

/** Active project: localStorage, then URL segment for project routes. */
export function resolveCurrentProject() {
  const fromStorage = normalizeProjectName(localStorage.getItem('currentProject'));
  const fromRoute = normalizeProjectName(projectNameFromRoute());
  const resolved = fromStorage || fromRoute;

  if (fromRoute && fromRoute !== fromStorage) {
    localStorage.setItem('currentProject', fromRoute);
  }

  return resolved;
}

/** True when URL is `#/git/<project>` (project-scoped git tab). */
export function isProjectGitRoute(route = getRoutePath()) {
  return /^\/git\/[^/?#]+/.test(route);
}

export function projectNameFromGitRoute(route = getRoutePath()) {
  const match = route.match(/^\/git\/([^/?#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].replace(/[@]/g, '/'));
  } catch {
    return match[1].replace(/[@]/g, '/');
  }
}
