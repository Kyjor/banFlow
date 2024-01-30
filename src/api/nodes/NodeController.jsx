import { ipcRenderer } from 'electron';

/**
 * @class NodeController
 * @desc Interacts with the ipcRenderer to perform CRUD operations on nodes. This is the interface between the UI and the database.
 */
const NodeController = {
  /**
   * @function getNodes
   * @desc gets all nodes
   * @route Nodes
   * @returns {array} node - all nodes
   * @permission {Read}
   */
  getNodes() {
    return ipcRenderer.sendSync('api:getNodes');
  },

  getNode(nodeId) {
    return ipcRenderer.sendSync('api:getNode', nodeId);
  },

  getNodesWithQuery(query) {
    return ipcRenderer.sendSync('api:getNodesWithQuery', query);
  },

  getNodeTypes() {
    return ipcRenderer.sendSync('api:getNodeTypes');
  },

  getNodeStates() {
    return ipcRenderer.sendSync('api:getNodeStates');
  },

  /**
   * @function createNode
   * @desc creates a new Node with a set of given properties
   * @route Nodes
   * @param {string} nodeType - the type of node to create.
   * @param {string} nodeTitle - the title of the node.
   * @param {string} [parentId=``] - the Id of the parent of the node. Can be null or empty.
   * @returns {object} node - the newly created node
   * @permission {Modification}
   */
  createNode(nodeType, nodeTitle, parentId = ``) {
    return ipcRenderer.sendSync(
      'api:createNode',
      nodeType,
      nodeTitle,
      parentId,
    );
  },

  deleteNode(nodeId, parentId) {
    ipcRenderer.sendSync('api:deleteNode', nodeId, parentId);
  },

  updateNodeProperty(propertyToUpdate, nodeId, newValue) {
    return ipcRenderer.sendSync(
      'api:updateNodeProperty',
      propertyToUpdate,
      nodeId,
      newValue,
    );
  },
};

export default NodeController;
