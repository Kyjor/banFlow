/** Per-project active git repo path (fast lookup; canonical list is in project DB). */
export function getActiveProjectRepoPath(projectName) {
  if (!projectName) return null;
  const v = localStorage.getItem(`gitActiveRepo:${projectName}`);
  return v && v.trim() ? v.trim() : null;
}

export function setActiveProjectRepoPath(projectName, repoPath) {
  if (!projectName) return;
  const key = `gitActiveRepo:${projectName}`;
  if (repoPath?.trim()) {
    localStorage.setItem(key, repoPath.trim());
  } else {
    localStorage.removeItem(key);
  }
}
