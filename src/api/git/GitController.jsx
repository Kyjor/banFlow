import { tauriInvoke } from '../../utils/tauri';

const GitController = {
  async getStatus(repoPath) {
    return tauriInvoke('git:getRepositoryStatus', { repoPath });
  },

  async getDiff(repoPath, options = {}) {
    return tauriInvoke('git:getDiff', { repoPath, ...options });
  },

  async getCommitHistory(repoPath, limit = 20) {
    return tauriInvoke('git:getCommitHistory', { repoPath, maxCount: limit });
  },

  async stageFiles(repoPath, files) {
    return tauriInvoke('git:stageFiles', { repoPath, files });
  },

  async commit(repoPath, message) {
    return tauriInvoke('git:commit', { repoPath, message });
  },

  async getCurrentRepository() {
    return tauriInvoke('git:getCurrentRepository');
  },
};

export default GitController;
