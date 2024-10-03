import ISO8601ServiceInstance from './ISO8601Service';

const axios = require('axios');

const NodeService = {
  /**
   * @function getNodes
   * @desc gets all nodes
   * @route Nodes
   * @returns {array} node - all nodes
   * @permission {Read}
   */
  getNodes(lokiService) {
    const nodes = lokiService.nodes.find({ Id: { $ne: null } });

    let response = {};

    nodes.forEach((node) => {
      response = {
        ...response,
        [node.id]: {
          ...node,
        },
      };
    });

    return response;
  },

  getNode(lokiService, nodeId) {
    return lokiService.nodes.find({ id: nodeId })[0];
  },

  getNodesWithQuery(lokiService, query) {
    const nodes = lokiService.nodes.find(query);

    let response = {};

    nodes.forEach((node) => {
      response = {
        ...response,
        [node.id]: {
          ...node,
        },
      };
    });

    return response;
  },

  getNodeTypes(lokiService) {
    return lokiService.nodeTypes.find({ Id: { $ne: null } });
  },

  getNodeStates(lokiService) {
    return lokiService.nodeStates.find({ Id: { $ne: null } });
  },

  /**
   * @function createNode
   * @desc creates a new Node with a set of given properties
   * @route Nodes
   * @param lokiService
   * @param {string} nodeType - the type of node to create.
   * @param {string} nodeTitle - the title of the node.
   * @param {string} [parentId=``] - the Id of the parent of the node. Can be null or empty.
   * @param iterationId - the Id of the iteration the node is associated with
   * @param trelloData - the trello data to associate with the node
   * @returns {object} node - the newly created node
   * @permission {Modification}
   */
  createNode(
    lokiService,
    nodeType,
    nodeTitle,
    parentId = ``,
    iterationId = ``,
    trelloData = null,
  ) {
    const { nodes } = lokiService;
    const { parents } = lokiService;
    const nextId = nodes.data.length
      ? nodes.chain().simplesort('$loki', true).data()[0].$loki + 1
      : 1;

    const nodeData = {
      nodeType: `task`, // task, note or event. not editable
      nodeState: ``, // in progress, done, whatever the user decides
      scheduledDate: ``,
      tags: [],
      id: `node-${nextId}`,
      title: nodeTitle,
      description: ``,
      linkedNodes: ``,
      comments: [], // list of comments from users
      attachments: [], // paths of items attached
      coverImage: ``, // path of cover image
      images: [], // paths of screenshots
      videos: [], // paths of videos
      sessionHistory: [], // On 9/1/21 At 2:48 you worked on `x,y,z` for x time under parent x. Your comment: ` `
      sessionStart: 0, // On 9/1/21 At 2:48 you worked on `x,y,z` for x time under parent x. Your comment: ` `
      notes: ``,
      checklist: {
        title: `Checklist`,
        checks: [],
        timeSpent: 0,
      }, // array of objects with item name, item time, and item complete bool, item complete time as well
      timeSpent: 0, // time spent on item, in seconds
      parent: parentId, // the id of the parent item
      isComplete: false, // is the item marked as complete?
      created: `${ISO8601ServiceInstance.getISO8601Time()}`, // ISO8601 date time of when the item was created
      estimatedTime: 0, // estimated time, in seconds
      estimatedDate: ``,
      completedDate: ``,
      isLocked: false, // whether the node can be moved from the parent
      isArchived: false,
      iterationId, //
    };

    if (trelloData) {
      console.log('trelloData', trelloData);
      nodeData.trello = trelloData;
      nodeData.description = trelloData.desc;
    }

    const newNode = nodes.insert(nodeData);
    parents
      .chain()
      .find({ id: parentId })
      .update((parent) => {
        parent.nodeIds = [...parent.nodeIds, `node-${nextId}`];
      });

    lokiService.saveDB();
    return newNode;
  },

  deleteNode(lokiService, nodeId, parentId) {
    const { nodes } = lokiService;
    const { parents } = lokiService;

    console.log(`Deleting node with id ${nodeId} and parent id ${parentId}`);
    parents
      .chain()
      .find({ $ne: null })
      .update((parent) => {
        const newNodeIds = parent.nodeIds;
        newNodeIds.splice(newNodeIds.indexOf(nodeId), 1);
        parent.nodeIds = newNodeIds;
      });
    nodes.chain().find({ id: nodeId }).remove();

    lokiService.saveDB();
  },

  updateNodeProperty(
    lokiService,
    propertyToUpdate,
    nodeId,
    newValue,
    trelloAuth,
  ) {
    // If debug, print out the property to update and the new value
    if (process.env.NODE_ENV === `development`) {
      console.log(
        `Updating node with id ${nodeId}. ${propertyToUpdate} to ${newValue}`,
      );
    }

    if (newValue == null) {
      console.error(`You must pass a value to updateNodeProperty`);
      return;
    }
    let nodeToReturn = null;
    lokiService.nodes
      .chain()
      .find({ id: nodeId })
      .update((node) => {
        node[propertyToUpdate] = newValue;
        nodeToReturn = node;
      });

    lokiService.saveDB();
    // If debug, print out the property to update and the new value
    if (process.env.NODE_ENV === `development`) {
      console.log(
        `Node with id ${nodeId} and name ${nodeToReturn.title} updated successfully.`,
      );
    }

    console.log(trelloAuth);
    if (nodeToReturn.trello && trelloAuth) {
      const url = `https://api.trello.com/1/cards/${nodeToReturn.trello.id}?key=${trelloAuth.key}&token=${trelloAuth.token}&name=${nodeToReturn.title}&desc=${nodeToReturn.description}`;

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
        .then((data) => {
          console.log(data);
        })
        .catch((err) => {
          console.error(err);
        });
    }

    // eslint-disable-next-line consistent-return
    return nodeToReturn;
  },
};

export default NodeService;
