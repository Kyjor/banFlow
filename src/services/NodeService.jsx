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
   * @param trelloAuth - the object with trello key and token
   * @returns {object} node - the newly created node
   * @permission {Modification}
   */
  async createNode(
    lokiService,
    nodeType,
    nodeTitle,
    parentId = ``,
    iterationId = ``,
    trelloData = null,
    trelloAuth = null,
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
      lastUpdated: `${ISO8601ServiceInstance.getISO8601Time()}`,
      labels: [], // Array of label objects {id, name, color}
      dueDate: null, // ISO8601 date time
      startDate: null, // ISO8601 date time
    };

    const parent = lokiService.parents.findOne({ id: { $eq: parentId } });
    console.log('help me');
    if (trelloData) {
      // using trello data to create node
      nodeData.trello = trelloData;
      // Parse banflow:timeSpent from Trello description
      const { description, timeSpent } = NodeService.extractBanflowTimeSpentFromDescription(trelloData.desc);
      nodeData.description = description;
      if (typeof timeSpent === 'number') nodeData.timeSpent = timeSpent;
      nodeData.labels = trelloData.labels || [];
      nodeData.dueDate = trelloData.due;
      nodeData.startDate = trelloData.start;
    } else if (trelloAuth && parent?.trello) {
      // create trello node
      const url = `https://api.trello.com/1/cards?idList=${parent.trello.id}&key=${trelloAuth.key}&token=${trelloAuth.token}&name=${nodeTitle}`;
      const newNodeResponse = await axios
        .post(
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
          console.log('node data: ', nodeData);
          nodeData.trello = data;
          nodeData.labels = data.labels || [];
          nodeData.dueDate = data.due;
          nodeData.startDate = data.start;

          const newNode = nodes.insert(nodeData);
          parents
            .chain()
            .find({ id: parentId })
            .update((parent) => {
              parent.nodeIds = [...parent.nodeIds, `node-${nextId}`];
            });

          lokiService.saveDB();

          return newNode;
        })
        .catch((err) => {
          console.error(err);
        });
      console.log('trying to create new node');
      return newNodeResponse;
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
        node.lastUpdated = `${ISO8601ServiceInstance.getISO8601Time()}`;
        nodeToReturn = node;
      });

    lokiService.saveDB();
    // If debug, print out the property to update and the new value
    if (process.env.NODE_ENV === `development`) {
      console.log(
        `Node with id ${nodeId} and name ${nodeToReturn.title} updated successfully.`,
      );
    }

    const parent = lokiService.parents.findOne({
      id: { $eq: nodeToReturn.parent },
    });
    console.log(parent);
    if (nodeToReturn.trello && parent.trello && trelloAuth) {
      let url = `https://api.trello.com/1/cards/${nodeToReturn.trello.id}?key=${trelloAuth.key}&token=${trelloAuth.token}`;
      
      // Build query parameters based on what's being updated
      const params = [];
      
      if (propertyToUpdate === 'title') {
        params.push(`name=${encodeURIComponent(newValue)}`);
      }
      if (propertyToUpdate === 'timeSpent') {
        // Sync timeSpent to Trello description
        const currentDesc = nodeToReturn.trello.desc || nodeToReturn.description || '';
        const newDesc = NodeService.setBanflowTimeSpentInDescription(currentDesc, newValue);
        params.push(`desc=${encodeURIComponent(newDesc)}`);
      }
      if (propertyToUpdate === 'description') {
        // Remove any old banflow:timeSpent line from the new description
        const { description: cleanedDesc } = NodeService.extractBanflowTimeSpentFromDescription(newValue);
        // Append the current node's timeSpent value
        const timeSpentValue = nodeToReturn.timeSpent || 0;
        const newDesc = NodeService.setBanflowTimeSpentInDescription(cleanedDesc, timeSpentValue);
        params.push(`desc=${encodeURIComponent(newDesc)}`);
      }
      if (propertyToUpdate === 'dueDate') {
        params.push(`due=${encodeURIComponent(newValue)}`);
      }
      if (propertyToUpdate === 'startDate') {
        params.push(`start=${encodeURIComponent(newValue)}`);
      }
      if (propertyToUpdate === 'labels') {
        // For labels, we need to make a separate API call
        const labelIds = newValue.map(label => label.id).join(',');
        params.push(`idLabels=${labelIds}`);
      }
      
      url += `&${params.join('&')}`;

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
          lokiService.nodes
            .chain()
            .find({ id: nodeId })
            .update((node) => {
              node.trello = data;
              // Update local data with Trello response
              if (propertyToUpdate === 'labels') {
                node.labels = data.labels || [];
              }
              if (propertyToUpdate === 'dueDate') {
                node.dueDate = data.due;
              }
              if (propertyToUpdate === 'startDate') {
                node.startDate = data.start;
              }
              nodeToReturn = node;
            });

          lokiService.saveDB();
          console.log(`Node's trello data saved successfully.`);
        })
        .catch((err) => {
          console.error(err);
        });
    }

    // eslint-disable-next-line consistent-return
    return nodeToReturn;
  },

  // Helper: Append or update banflow:timeSpent in description, with separator
  setBanflowTimeSpentInDescription(description, timeSpent) {
    const separator = '---Banflow fields, do not edit this line or below it---';
    const banflowLine = `banflow:timeSpent=${timeSpent}`;
    const lines = description ? description.split('\n') : [];
    // Remove any previous separator and banflow fields
    const sepIndex = lines.findIndex(line => line.trim() === separator);
    const filtered = sepIndex === -1 ? lines : lines.slice(0, sepIndex);
    filtered.push(separator);
    filtered.push(banflowLine);
    return filtered.join('\n');
  },

  // Helper: Extract banflow:timeSpent from description, returns { description, timeSpent }
  extractBanflowTimeSpentFromDescription(description) {
    if (!description) return { description: '', timeSpent: null };
    const separator = '---Banflow fields, do not edit this line or below it---';
    const lines = description.split('\n');
    const sepIndex = lines.findIndex(line => line.trim() === separator);
    let timeSpent = null;
    if (sepIndex !== -1) {
      // Look for banflow:timeSpent in the lines after the separator
      for (let i = sepIndex + 1; i < lines.length; i++) {
        const match = lines[i].match(/^banflow:timeSpent=(\d+)/);
        if (match) {
          timeSpent = parseInt(match[1], 10);
          break;
        }
      }
    }
    // Only keep lines before the separator for the local description
    const cleaned = sepIndex === -1 ? lines : lines.slice(0, sepIndex);
    return { description: cleaned.join('\n'), timeSpent };
  },
};

export default NodeService;
