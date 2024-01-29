import nodeService from '../../services/NodeService';

/**
 * @class NodeController
 * @desc creates a new Node with a set of given properties
 */
const NodeController = {
  /**
   * @function getNodes
   * @desc gets all nodes
   * @route Nodes
   * @returns {array} node - all nodes
   * @permission {Read}
   */
  async getNodes() {
    return nodeService.getNodes();
  },

  async getNode(nodeId) {
    return nodeService.getNode(nodeId);
  },

  async getNodesWithQuery(query) {
    return nodeService.getNodesWithQuery(query);
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
    return nodeService.createNode(nodeType, nodeTitle, parentId);
  },

  deleteNode(nodeId, parentId) {
    nodeService.deleteNode(nodeId, parentId);
  },

  updateNodeProperty(propertyToUpdate, nodeId, newValue) {
    return nodeService.updateNodeProperty(propertyToUpdate, nodeId, newValue);
  },
};

export default NodeController;
