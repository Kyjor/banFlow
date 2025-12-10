import axios from 'axios';

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
    trelloAuth,
  ) {
    const { nodes, parents } = lokiService;
    console.log(updatedOriginParent.nodeIds);
    console.log(updatedDestinationParent.nodeIds);

    let nodeToUpdate = null;
    let parentToUpdate = null;
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
        parentToUpdate = parent;
      });
    nodes
      .chain()
      .find({ id: nodeId })
      .update((node) => {
        node.parent = updatedDestinationParent.id;
        nodeToUpdate = node;
      });
    
    // If the destination parent has markAsDoneOnDrag enabled, mark the node as complete
    if (parentToUpdate && parentToUpdate.markAsDoneOnDrag && nodeToUpdate) {
      const ISO8601ServiceInstance = require('./ISO8601Service').default;
      console.log(`Marking node ${nodeId} as complete due to markAsDoneOnDrag on parent ${parentToUpdate.id}`);
      nodes
        .chain()
        .find({ id: nodeId })
        .update((node) => {
          node.isComplete = true;
          // Set completedDate if not already set
          if (!node.completedDate) {
            node.completedDate = ISO8601ServiceInstance.getISO8601Time();
          }
          console.log(`Node ${nodeId} marked as complete:`, node.isComplete, node.completedDate);
        });
    }
    
    lokiService.saveDB();

    // Refresh nodeToUpdate after potential completion update
    if (parentToUpdate && parentToUpdate.markAsDoneOnDrag) {
      nodeToUpdate = nodes.findOne({ id: nodeId });
    }

    console.log('trelloAuth', trelloAuth);
    if (
      nodeToUpdate &&
      nodeToUpdate.trello &&
      parentToUpdate &&
      parentToUpdate.trello &&
      trelloAuth
    ) {
      console.log('Updating Trello card');
      const url = `https://api.trello.com/1/cards/${nodeToUpdate.trello.id}?key=${trelloAuth.key}&token=${trelloAuth.token}&idList=${parentToUpdate.trello.id}`;

      axios
        .put(
          url,
          {},
          {
            headers: {
              Accept: 'application/json',
            },
          },
        )
        .then((response) => {
          console.log(`Response: ${response.status} ${response.statusText}`);
          return response.data;
        })
        .catch((err) => {
          console.error(err);
        });
    }
  },
};

export default ParentService;
