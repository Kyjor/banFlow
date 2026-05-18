import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';

/**
 * @class ParentController
 * @desc Interacts with the ipcRenderer to perform CRUD operations on nodes. This is the interface between the UI and the database.
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

    // Call Tauri command (like Electron's ipcRenderer.sendSync)
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
    await tauriSendSync('api:deleteParent', parentId);
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
    await tauriSendSync('api:updateParentOrder', parentOrder);
  },

  async updateNodesInParents(updatedOriginParent, updatedDestinationParent, nodeId) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[ParentController] No project name found');
      return;
    }
    
    const trelloAuth = {
      key: localStorage.getItem(`trelloKey`),
      token: localStorage.getItem(`trelloToken`),
    };

    return await tauriInvoke('api:updateNodesInParents', {
      projectName,
      updatedOriginParent,
      updatedDestinationParent,
      nodeId,
      trelloAuth: trelloAuth || null,
    });
  },
};

export default ParentController;
