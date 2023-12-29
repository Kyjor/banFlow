import lokiService from './LokiService';

/**
 * @class ParentService
 * @desc creates a new Parent with a set of given properties
 */
class ParentService {
  /**
   * @function getParents
   * @desc gets all parents
   * @route Parent
   * @returns {array} parent - all parents
   * @permission {Read}
   */
  getParents = () => {
    const parents = lokiService.parents.find({ Id: { $ne: null } });

    let response = {};

    parents.forEach((parent) => {
      response = {
        ...response,
        [parent.id]: {
          ...parent,
        },
      };
    });

    return response;
  };

  /**
   * @function getParentOrder
   * @desc gets the order of all parents
   * @route Parent/Order
   * @returns {array} string - the order of parents represented by id
   * @permission {Read}
   */
  getParentOrder = () => {
    const parentOrder = lokiService.parentOrder.find({ Id: { $ne: null } });

    const response = [];

    parentOrder.forEach((obj) => {
      response.push(obj.parentId);
    });

    return response;
  };

  createParent = (parentTitle) => {
    const { parents } = lokiService;

    const nextId = parents.data.length
      ? parents.chain().simplesort('$loki', true).data()[0].$loki + 1
      : 1;
    const newParent = parents.insert({
      id: `parent-${nextId}`,
      title: parentTitle,
      timeSpent: 0, // the amount of time worked on items WHILE in the parent
      isTimed: true,
      nodeHistory: [],
      sessionHistory: [],
      nodeIds: [],
    });
    this.addParentToOrder(`parent-${nextId}`);
    lokiService.saveDB();

    return newParent;
  };

  addParentToOrder = (newParentId) => {
    lokiService.parentOrder.insert({ parentId: newParentId });
    lokiService.saveDB();
  };

  deleteParent = (parentId) => {
    const { parents, parentOrder } = lokiService;

    parentOrder.chain().find({ parentId }).remove();
    parents.chain().find({ id: parentId }).find({ id: parentId }).remove();

    lokiService.saveDB();
  };

  updateParentProperty = (propertyToUpdate, parentId, newValue) => {
    let parentToReturn = null;
    lokiService.parents
      .chain()
      .find({ id: parentId })
      .update(function (parent) {
        parent[propertyToUpdate] = newValue;
        parentToReturn = parent;
      });

    lokiService.saveDB();
    return parentToReturn;
  };

  updateParentOrder = (parentOrder) => {
    let x = 1;
    const currentParentOrder = lokiService.parentOrder;

    // iterate through parent order and change the names in loki collection to match
    parentOrder.forEach((parentId) => {
      currentParentOrder
        .chain()
        .find({ $loki: x })
        .update(function (index) {
          index.parentId = parentId;
        });
      x++;
    });

    lokiService.saveDB();
  };

  updateNodesInParents = (
    updatedOriginParent,
    updatedDestinationParent,
    nodeId
  ) => {
    const { nodes, parents } = lokiService;
    parents
      .chain()
      .find({ id: updatedOriginParent.id })
      .update(function (parent) {
        parent.nodeIds = updatedOriginParent.nodeIds;
      });
    parents
      .chain()
      .find({ id: updatedDestinationParent.id })
      .update(function (parent) {
        parent.nodeIds = updatedDestinationParent.nodeIds;
      });
    nodes
      .chain()
      .find({ id: nodeId })
      .update(function (node) {
        node.parent = updatedDestinationParent.id;
      });
    lokiService.saveDB();
  };
}

// create one instance of the class to export so everyone can share it
const parentService = new ParentService();
export default parentService;
