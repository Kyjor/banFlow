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
    const trelloAuth = {
      key: localStorage.getItem(`trelloKey`),
      token: localStorage.getItem(`trelloToken`),
    };

    const test = await ipcRenderer.invoke(
      'api:createNode',
      nodeType,
      nodeTitle,
      parentId,
      iterationId,
      trelloData,
      trelloAuth,
    );
    console.log(test);
    return test;
  },

  deleteNode(nodeId, parentId) {
    ipcRenderer.sendSync('api:deleteNode', nodeId, parentId);
  },

  updateNodeProperty(propertyToUpdate, nodeId, newValue, shouldSync = true) {
    let trelloAuth = {
      key: localStorage.getItem(`trelloKey`),
      token: localStorage.getItem(`trelloToken`),
    };

    if (!shouldSync) {
      trelloAuth = null;
    }

    return ipcRenderer.sendSync(
      'api:updateNodeProperty',
      propertyToUpdate,
      nodeId,
      newValue,
      trelloAuth,
    );
  },
};

export default NodeController;
