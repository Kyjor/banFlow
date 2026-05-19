import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';
import {
  getTrelloAuth,
  syncNodePropertyToTrello,
  syncNewNodeToTrello,
  applyTrelloCardToLocalNode,
} from '../../services/TrelloSyncService';

/**
 * @class NodeController
 * @desc Interacts with Tauri commands to perform CRUD operations on nodes. This is the interface between the UI and the database.
 */
const NodeController = {
  /**
   * @function getNodes
   * @desc gets all nodes
   * @route Nodes
   * @returns {object} nodes - all nodes keyed by id
   * @permission {Read}
   */
  async getNodes() {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[NodeController] No project name found in localStorage');
      return {};
    }

    // Load nodes from Rust backend (api_get_nodes) so UI reflects persisted state
    const nodes = await tauriSendSync('api:getNodes', { projectName });
    return nodes || {};
  },

  async getNode(nodeId) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[NodeController] No project name found in localStorage');
      throw new Error('No project name found. Please open a project first.');
    }

    return await tauriSendSync('api:getNode', { projectName, nodeId });
  },

  async getNodesWithQuery(query) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[NodeController] No project name found in localStorage');
      return {};
    }

    return await tauriSendSync('api:getNodesWithQuery', { projectName, query });
  },

  async getNodeTypes() {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      return [];
    }
    try {
      const result = await tauriSendSync('api:getNodeTypes', { projectName });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('[NodeController] Error getting node types:', error);
      return [];
    }
  },

  async getNodeStates() {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      return [];
    }
    try {
      const result = await tauriSendSync('api:getNodeStates', { projectName });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('[NodeController] Error getting node states:', error);
      return [];
    }
  },

  /**
   * @function createNode
   * @desc creates a new Node with a set of given properties
   * @route Nodes
   * @param {string} nodeType - the type of node to create.
   * @param {string} nodeTitle - the title of the node.
   * @param {string} [parentId=``] - the Id of the parent of the node. Can be null or empty.
   * @param iterationId - the Id of the iteration the node is associated with
   * @param trelloData - the trello data to associate with the node
   * @returns {object} node - the newly created node
   * @permission {Modification}
   */
  async createNode(
    nodeType,
    nodeTitle,
    parentId = ``,
    iterationId = ``,
    trelloData = null,
  ) {
    console.log('[NodeController] createNode called:', { nodeType, nodeTitle, parentId, iterationId });
    
    // Get project name from localStorage (stored as 'currentProject' in ProjectPage)
    // Also try to get from URL if localStorage is empty (fallback)
    let projectName = localStorage.getItem('currentProject');
    if (!projectName) {
      // Fallback: try to extract from URL like ProjectPage does
      const location = window.location.href;
      const urlProjectName = location.split('/').pop()?.split('?')[0];
      if (urlProjectName) {
        try {
          projectName = decodeURIComponent(urlProjectName.replace(/[@]/g, '/'));
        } catch (e) {
          console.warn('[NodeController] Failed to decode project name from URL');
        }
      }
    }
    if (!projectName) {
      throw new Error('No project name found. Please open a project first.');
    }

    // Get Trello auth if needed
    const trelloAuth = trelloData ? {
      key: localStorage.getItem(`trelloKey`),
      token: localStorage.getItem(`trelloToken`),
    } : null;

    // Call Tauri backend command (like Electron's ipcMain.handle('api:createNode'))
    let newNode = await tauriInvoke('api:createNode', {
      projectName,
      nodeType,
      nodeTitle,
      parentId,
      iterationId: iterationId || null,
      trelloData: trelloData || null,
      trelloAuth: trelloAuth || null,
    });

    if (trelloData) {
      await applyTrelloCardToLocalNode(newNode.id, trelloData);
      const nodes = await tauriInvoke('api:getNodes', { projectName });
      newNode = nodes?.[newNode.id] || newNode;
    } else {
      newNode = await syncNewNodeToTrello(newNode, parentId, trelloData);
    }

    console.log('[NodeController] Node created via backend:', newNode);
    return newNode;
  },

  async deleteNode(nodeId, parentId) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[NodeController] No project name found in localStorage');
      throw new Error('No project name found. Please open a project first.');
    }

    await tauriSendSync('api:deleteNode', { projectName, nodeId, parentId });
  },

  async updateNodeProperty(propertyToUpdate, nodeId, newValue, shouldSync = true) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[NodeController] No project name found in localStorage');
      throw new Error('No project name found. Please open a project first.');
    }
    const trelloAuth = shouldSync ? getTrelloAuth() : null;

    const updatedNode = await tauriInvoke('api:updateNodeProperty', {
      projectName,
      propertyToUpdate,
      nodeId,
      newValue,
      trelloAuth: null,
    });

    if (trelloAuth && propertyToUpdate !== 'trello') {
      return syncNodePropertyToTrello(
        updatedNode,
        propertyToUpdate,
        newValue,
        trelloAuth,
      );
    }

    return updatedNode;
  },
};

export default NodeController;
