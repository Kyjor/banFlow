const COLUMN_PRIORITY = [
  'up next',
  'todo',
  'to do',
  'inbox',
  'backlog',
  'doing',
  'in progress',
  'next',
];

/** @param {{ id: string; title: string }[]} parents */
export function pickDefaultParent(parents) {
  if (!parents?.length) return null;
  for (const name of COLUMN_PRIORITY) {
    const hit = parents.find((p) => p.title.toLowerCase() === name);
    if (hit) return hit;
  }
  return parents[0];
}

/** @param {string | undefined} raw @param {{ id: string; title: string }[]} parents */
export function resolveParentId(raw, parents) {
  if (!parents?.length) return null;
  const key = String(raw || '').trim();
  if (!key) return null;

  const byId = parents.find((p) => p.id === key);
  if (byId) return byId.id;

  const lower = key.toLowerCase();
  const byTitle = parents.find((p) => p.title.toLowerCase() === lower);
  if (byTitle) return byTitle.id;

  const partial = parents.find(
    (p) =>
      p.title.toLowerCase().includes(lower) ||
      lower.includes(p.title.toLowerCase()),
  );
  return partial?.id ?? null;
}
