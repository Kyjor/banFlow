import { tauriInvoke } from '../../../utils/tauri';
import { resolveCurrentProject } from '../../../utils/currentProject';
import { getActiveProjectRepoPath } from '../../../utils/gitProjectStorage';

function pickPath(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** @param {string} [projectName] */
export function resolveGitRepoPathFromStorage(projectName) {
  if (projectName) {
    const perProject = pickPath(getActiveProjectRepoPath(projectName));
    if (perProject) return perProject;
  }

  const lastActive = pickPath(localStorage.getItem('gitLastActiveRepoPath'));
  if (lastActive) return lastActive;

  if (projectName) {
    const legacy = pickPath(localStorage.getItem(`gitRepo:${projectName}`));
    if (legacy) return legacy;
  }

  try {
    const paths = JSON.parse(localStorage.getItem('gitRepoPaths') || '[]');
    if (Array.isArray(paths)) {
      const first = paths.map(pickPath).find(Boolean);
      if (first) return first;
    }
  } catch {
    /* ignore */
  }

  return null;
}

/**
 * @param {string | null | undefined} [providedRepoPath]
 * @param {string | null | undefined} [projectName]
 */
export async function resolveGitRepoPath(providedRepoPath, projectName) {
  const explicit = pickPath(providedRepoPath);
  if (explicit) return explicit;

  const project = projectName ?? resolveCurrentProject();
  if (!project) {
    return resolveGitRepoPathFromStorage(null);
  }

  try {
    const repos = await tauriInvoke('git:loadProjectRepositories', { projectName: project });
    if (Array.isArray(repos) && repos.length > 0) {
      const active = repos.find((r) => r.isActive === true) || repos[0];
      const path = pickPath(active?.path);
      if (path) return path;
    }
  } catch (e) {
    console.warn('[resolveGitRepoPath] loadProjectRepositories failed', e);
  }

  return resolveGitRepoPathFromStorage(project);
}

/** @param {string | null | undefined} [providedRepoPath] */
export async function requireGitRepoPath(providedRepoPath) {
  const path = await resolveGitRepoPath(providedRepoPath);
  if (!path) {
    throw new Error(
      'No git repository is linked to this project. Open the Git tab, add a repo, and it will be saved with the project.',
    );
  }
  return path;
}
