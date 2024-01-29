import parentService from '../../services/ParentService';

/**
 * @class ParentController
 * @desc creates a new Parent with a set of given properties
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
    return parentService.getParents();
  },

  /**
   * @function getParentOrder
   * @desc gets the order of all parents
   * @route Parent/Order
   * @returns {array} string - the order of parents represented by id
   * @permission {Read}
   */
  async getParentOrder() {
    return parentService.getParentOrder();
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
  createParent(parentTitle) {
    return parentService.createParent(parentTitle);
  },

  deleteParent(parentId) {
    parentService.deleteParent(parentId);
  },

  updateParentProperty(propertyToUpdate, parentId, newValue) {
    return parentService.updateParentProperty(
      propertyToUpdate,
      parentId,
      newValue,
    );
  },

  updateParentOrder(parentOrder) {
    parentService.updateParentOrder(parentOrder);
  },

  updateNodesInParents(updatedOriginParent, updatedDestinationParent, nodeId) {
    parentService.updateNodesInParents(
      updatedOriginParent,
      updatedDestinationParent,
      nodeId,
    );
  },
};

export default ParentController;
