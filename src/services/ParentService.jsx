const ParentService = {
  /**
   * @function getParents
   * @desc gets all parents
   * @route Parent
   * @returns {array} parent - all parents
   * @permission {Read}
   */
  getParents(lokiService) {
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
  },

  /**
   * @function getParentOrder
   * @desc gets the order of all parents
   * @route Parent/Order
   * @returns {array} string - the order of parents represented by id
   * @permission {Read}
   */
  getParentOrder(lokiService) {
    const parentOrder = lokiService.parentOrder.find({ Id: { $ne: null } });

    const response = [];

    parentOrder.forEach((obj) => {
      response.push(obj.parentId);
    });

    return response;
  },

  createParent(lokiService, parentTitle, trelloData) {
    const { parents } = lokiService;

    const nextId = parents.data.length
      ? parents.chain().simplesort('$loki', true).data()[0].$loki + 1
      : 1;

    const parentData = {
      id: `parent-${nextId}`,
      title: parentTitle,
      timeSpent: 0, // the amount of time worked on items WHILE in the parent
      isTimed: true,
      nodeHistory: [],
      sessionHistory: [],
      nodeIds: [],
    };

    if (trelloData) {
      console.log('trelloData', trelloData);
      parentData.trello = trelloData;
    }

    const newParent = parents.insert(parentData);
    this.addParentToOrder(lokiService, `parent-${nextId}`);
    lokiService.saveDB();

    return newParent;
  },

  addParentToOrder(lokiService, newParentId) {
    lokiService.parentOrder.insert({ parentId: newParentId });
    lokiService.saveDB();
  },

  deleteParent(lokiService, parentId) {
    const { parents, parentOrder } = lokiService;

    parentOrder.chain().find({ parentId }).remove();
    parents.chain().find({ id: parentId }).find({ id: parentId }).remove();

    lokiService.saveDB();
  },

  updateParentProperty(lokiService, propertyToUpdate, parentId, newValue) {
    let parentToReturn = null;
    lokiService.parents
      .chain()
      .find({ id: parentId })
      .update((parent) => {
        parent[propertyToUpdate] = newValue;
        parentToReturn = parent;
      });

    lokiService.saveDB();
    return parentToReturn;
  },

  updateParentOrder(lokiService, parentOrder) {
    let x = 1;
    const currentParentOrder = lokiService.parentOrder;

    // iterate through parent order and change the names in loki collection to match
    parentOrder.forEach((parentId) => {
      currentParentOrder
        .chain()
        .find({ $loki: x })
        .update((index) => {
          index.parentId = parentId;
        });
      x += 1;
    });

    lokiService.saveDB();
  },

  updateNodesInParents(
    lokiService,
    updatedOriginParent,
    updatedDestinationParent,
    nodeId,
  ) {
    const { nodes, parents } = lokiService;
    console.log(updatedOriginParent.nodeIds);
    console.log(updatedDestinationParent.nodeIds);

    parents
      .chain()
      .find({ id: updatedOriginParent.id })
      .update((parent) => {
        parent.nodeIds = updatedOriginParent.nodeIds;
      });
    parents
      .chain()
      .find({ id: updatedDestinationParent.id })
      .update((parent) => {
        parent.nodeIds = updatedDestinationParent.nodeIds;
      });
    nodes
      .chain()
      .find({ id: nodeId })
      .update((node) => {
        node.parent = updatedDestinationParent.id;
      });
    lokiService.saveDB();
  },
};

export default ParentService;
