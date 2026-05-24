import NodeController from '../../../api/nodes/NodeController';
import ParentController from '../../../api/parent/ParentController';
import DocsController from '../../../api/docs/DocsController';
import DiagramsController from '../../../api/diagrams/DiagramsController';
import GitController from '../../../api/git/GitController';
import ProjectController from '../../../api/project/ProjectController';
import { tauriInvoke } from '../../../utils/tauri';
import { applyProposal } from './applyProposal';
import { resolveCurrentProject, getRoutePath } from './resolveCurrentProject';
import { resolveGitRepoPath, requireGitRepoPath } from './resolveGitRepoPath';

export { resolveCurrentProject, getRoutePath, projectNameFromRoute } from './resolveCurrentProject';
export { resolveGitRepoPath, requireGitRepoPath } from './resolveGitRepoPath';

const undoStacks = new Map();

async function appendAudit(pluginId, entry) {
  if (!pluginId) return;
  try {
    await tauriInvoke('plugin_audit_append', { pluginId, entry });
  } catch (e) {
    console.warn('[actions] audit log failed', e);
  }
}

/** @param {string} [pluginId] @param {string[]} [manifestPermissions] */
export function createPluginActions(pluginId, manifestPermissions = []) {
  const permissions = new Set(manifestPermissions);

  function assertPermission(perm) {
    if (permissions.size && !permissions.has(perm)) {
      throw new Error(`Plugin lacks permission: ${perm}`);
    }
  }

  return {
    async getWorkbenchContext() {
      const projectName = resolveCurrentProject();
      let parentsSummary = [];
      let recentNodes = [];
      let git;

      if (projectName) {
        try {
          const parents = await ParentController.getParents();
          parentsSummary = Object.values(parents || {})
            .slice(0, 20)
            .map((p) => ({
              id: p.id,
              title: p.title || p.parentTitle || p.id,
            }));
          const nodes = await NodeController.getNodes();
          recentNodes = Object.values(nodes || {})
            .slice(0, 30)
            .map((n) => ({ id: n.id, title: n.title, parentId: n.parent }));
        } catch (e) {
          console.warn('[actions] workbench context partial', e);
        }
        try {
          const repoPath = await resolveGitRepoPath(null, projectName);
          if (repoPath) {
            const status = await GitController.getStatus(repoPath);
            git = {
              repoPath,
              branch: status?.currentBranch,
              dirtyFileCount: status?.modified?.length ?? status?.changed?.length,
              stagedFiles: status?.staged ?? [],
            };
          }
        } catch {
          /* no git */
        }
      }

      return {
        projectName,
        route: getRoutePath(),
        parentsSummary,
        recentNodes,
        git,
      };
    },

    assertPermissionForProposal(perm) {
      assertPermission(perm);
    },

    apply: async (proposal) => {
      const permMap = {
        'nodes.batchCreate': 'nodes:write',
        'nodes.update': 'nodes:write',
        'nodes.delete': 'nodes:write',
        'parents.create': 'parents:write',
        'parents.update': 'parents:write',
        'parents.delete': 'parents:write',
        'docs.save': 'docs:write',
        'docs.delete': 'docs:write',
        'diagrams.save': 'diagrams:write',
        'git.stageAndCommit': 'git:write',
      };
      const perm = permMap[proposal.type];
      if (perm) assertPermission(perm);
      const stack = undoStacks.get(pluginId) || [];
      stack.push({ proposal, at: Date.now() });
      undoStacks.set(pluginId, stack.slice(-20));
      await applyProposal(proposal);
      await appendAudit(pluginId, { type: 'apply', proposalType: proposal.type, at: Date.now() });
    },

    async undoLast(pluginIdOverride) {
      const id = pluginIdOverride || pluginId;
      const stack = undoStacks.get(id) || [];
      if (!stack.length) return false;
      stack.pop();
      undoStacks.set(id, stack);
      return true;
    },

    projects: {
      current: () => resolveCurrentProject(),
      list: () => ProjectController.getProjects(),
      setCurrent: (name) => {
        if (name) localStorage.setItem('currentProject', name);
        return ProjectController.setCurrentProjectName(name);
      },
    },

    nodes: {
      list: () => NodeController.getNodes(),
      get: (nodeId) => NodeController.getNode(nodeId),
      query: (query) => NodeController.getNodesWithQuery(query),
    },

    parents: {
      list: () => ParentController.getParents(),
      getOrder: () => ParentController.getParentOrder(),
    },

    docs: {
      list: (isGlobal) => DocsController.list(isGlobal),
      read: (path, isGlobal) => DocsController.read(path, isGlobal),
    },

    diagrams: {
      list: (isGlobal) => DiagramsController.list(isGlobal),
      read: (path, isGlobal) => DiagramsController.read(path, isGlobal),
    },

    git: {
      getStatus: async (repoPath) =>
        GitController.getStatus(await requireGitRepoPath(repoPath)),
      getDiff: async (repoPath, options) =>
        GitController.getDiff(await requireGitRepoPath(repoPath), options),
      getCommitHistory: async (repoPath, limit) =>
        GitController.getCommitHistory(await requireGitRepoPath(repoPath), limit),
      stageFiles: async (repoPath, files) =>
        GitController.stageFiles(await requireGitRepoPath(repoPath), files),
      commit: async (repoPath, message) =>
        GitController.commit(await requireGitRepoPath(repoPath), message),
    },

    navigation: {
      openRoute: (path) => {
        window.location.hash = path.startsWith('/') ? path : `/${path}`;
      },
      getRoute: getRoutePath,
    },

    _pluginId: pluginId,
    _permissions: permissions,
  };
}
