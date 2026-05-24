import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';
import { getTrelloAuth, syncCardListAfterMove } from '../../services/TrelloSyncService';

/**
 * @class ParentController
 * @desc Tauri invoke layer for parents/nodes (UI ↔ backend).
 */
const ParentController = {
  /**
   * @function getParents
   * @desc gets all parents
   * @route Parent
   * @returns {array} parent - all parents
   * @permission {Read}
   */
  async getParents() {
    const projectName = localStorage.getItem('currentProject') || '';
    if (projectName) {
      try {
        return (await tauriInvoke('api:getParents', { projectName })) || {};
      } catch (error) {
        console.warn('[ParentController] api:getParents failed, trying Loki:', error);
      }
    }

    const { getCurrentLokiService } = await import('../../stores/shared');
    const lokiService = getCurrentLokiService();
    if (!lokiService) {
      console.error('[ParentController] No LokiService available');
      return {};
    }

    const { default: ParentService } = await import('../../services/ParentService');
    return ParentService.getParents(lokiService);
  },

  /**
   * @function getParentOrder
   * @desc gets the order of all parents
   * @route Parent/Order
   * @returns {array} string - the order of parents represented by id
   * @permission {Read}
   */
  async getParentOrder() {
    const { getCurrentLokiService } = await import('../../stores/shared');
    const lokiService = getCurrentLokiService();
    
    if (!lokiService) {
      console.error('[ParentController] No LokiService available');
      return [];
    }

    const { default: ParentService } = await import('../../services/ParentService');
    return ParentService.getParentOrder(lokiService);
  },

  /**
   * @function createParent
   * @desc creates a new Parent with a set of given properties
   * @route Parents
   * @param {string} parentType - the type of parent to create.
   * @param {string} parentTitle - the title of the parent.
   * @param {string} [parentId=``] - the Id of the parent of the parent. Can be null or empty.
   * @returns {object} parent - the newly created parent
   * @permission {Modification}
   */
  async createParent(parentTitle, trelloData) {
    console.log('[ParentController] createParent called:', { parentTitle, trelloData: !!trelloData });
    const trelloAuth = {
      key: localStorage.getItem(`trelloKey`),
      token: localStorage.getItem(`trelloToken`),
    };

    // Tauri invoke (sync-style via invoke)
    const projectName = localStorage.getItem('currentProject') || '';
    const result = await tauriSendSync('api:createParent', {
      projectName,
      parentTitle,
      trelloData: trelloData || null,
      trelloAuth: trelloAuth || null,
    });
    
    console.log('[ParentController] createParent result:', result);
    return result;
  },

  async deleteParent(parentId) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      throw new Error('No project name found. Please open a project first.');
    }
    await tauriInvoke('api:deleteParent', { projectName, parentId });
  },

  async updateParentProperty(propertyToUpdate, parentId, newValue) {
    const projectName = localStorage.getItem('currentProject') || '';
    return await tauriInvoke('api:updateParentProperty', {
      projectName,
      propertyToUpdate,
      parentId,
      newValue,
    });
  },

  async updateParentOrder(parentOrder) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      throw new Error('No project name found. Please open a project first.');
    }
    await tauriInvoke('api:updateParentOrder', { projectName, parentOrder });
  },

  async updateNodesInParents(updatedOriginParent, updatedDestinationParent, nodeId) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[ParentController] No project name found');
      return;
    }
    
    const result = await tauriInvoke('api:updateNodesInParents', {
      projectName,
      updatedOriginParent,
      updatedDestinationParent,
      nodeId,
      trelloAuth: null,
    });

    const trelloAuth = getTrelloAuth();
    if (trelloAuth) {
      await syncCardListAfterMove(nodeId, updatedDestinationParent, trelloAuth);
    }

    return result;
  },
};

export default ParentController;
