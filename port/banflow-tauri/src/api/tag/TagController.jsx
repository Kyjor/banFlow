import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';

/**
 * @class TagController
 * @desc Interacts with the ipcRenderer to perform CRUD operations on tags. This is the interface between the UI and the database.
 */
const TagController = {
  async getTags() {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      return [];
    }
    try {
      const tags = await tauriSendSync('api:getTags', { projectName });
      // Ensure we always return an array (like Electron)
      return Array.isArray(tags) ? tags : [];
    } catch (error) {
      console.error('[TagController] Error getting tags:', error);
      return [];
    }
  },
  async addTag(tagTitle, color = '') {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[TagController] No project name found');
      return null;
    }
    return await tauriInvoke('api:addTag', {
      projectName,
      tagTitle,
      color,
    });
  },
  async updateTagColor(tagTitle, color) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[TagController] No project name found');
      return;
    }
    return await tauriInvoke('api:updateTagColor', {
      projectName,
      tagTitle,
      color,
    });
  },
};

export default TagController;
