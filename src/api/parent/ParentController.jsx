import { ipcRenderer } from 'electron';

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
  getParents() {
    return ipcRenderer.sendSync('api:getParents');
  },

  /**
   * @function getParentOrder
   * @desc gets the order of all parents
   * @route Parent/Order
   * @returns {array} string - the order of parents represented by id
   * @permission {Read}
   */
  getParentOrder() {
    return ipcRenderer.sendSync('api:getParentOrder');
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
  createParent(parentTitle, trelloData) {
    const trelloAuth = {
      key: localStorage.getItem(`trelloKey`),
      token: localStorage.getItem(`trelloToken`),
    };

    return ipcRenderer.sendSync(
      'api:createParent',
      parentTitle,
      trelloData,
      trelloAuth,
    );
  },

  deleteParent(parentId) {
    ipcRenderer.sendSync('api:deleteParent', parentId);
  },

  updateParentProperty(propertyToUpdate, parentId, newValue) {
    return ipcRenderer.sendSync(
      'api:updateParentProperty',
      propertyToUpdate,
      parentId,
      newValue,
    );
  },

  updateParentOrder(parentOrder) {
    ipcRenderer.sendSync('api:updateParentOrder', parentOrder);
  },

  updateNodesInParents(updatedOriginParent, updatedDestinationParent, nodeId) {
    const trelloAuth = {
      key: localStorage.getItem(`trelloKey`),
      token: localStorage.getItem(`trelloToken`),
    };

    ipcRenderer.sendSync(
      'api:updateNodesInParents',
      updatedOriginParent,
      updatedDestinationParent,
      nodeId,
      trelloAuth,
    );
  },
};

export default ParentController;
