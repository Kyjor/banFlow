import lokiService from './LokiService';
import ISO8601ServiceInstance from './ISO8601Service';

/**
 * @class NodeService
 * @desc creates a new Node with a set of given properties
 */
class NodeService {
  /**
   * @function getNodes
   * @desc gets all nodes
   * @route Nodes
   * @returns {array} node - all nodes
   * @permission {Read}
   */
  getNodes = () => {
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
  };

  getNode = (nodeId) => {
    return lokiService.nodes.find({ id: nodeId })[0];
  };

  getNodesWithQuery = (query) => {
    return lokiService.nodes.find(query);
  };

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
  createNode = (nodeType, nodeTitle, parentId = ``) => {
    const { nodes } = lokiService;
    const { parents } = lokiService;
    const nextId = nodes.data.length
      ? nodes.chain().simplesort('$loki', true).data()[0].$loki + 1
      : 1;

    const newNode = nodes.insert({
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
      isLocked: false, // whether or not the node can be moved from the parent
      isArchived: false,
      iteration: null, //
    });
    parents
      .chain()
      .find({ id: parentId })
      .update(function (parent) {
        parent.nodeIds = [...parent.nodeIds, `node-${nextId}`];
      });

    lokiService.saveDB();
    return newNode;
  };

  deleteNode = (nodeId, parentId) => {
    const { nodes } = lokiService;
    const { parents } = lokiService;

    parents
      .chain()
      .find({ id: parentId })
      .update(function (parent) {
        const newNodeIds = parent.nodeIds;
        newNodeIds.splice(newNodeIds.indexOf(nodeId), 1);
        parent.nodeIds = newNodeIds;
      });
    nodes.chain().find({ id: nodeId }).remove();

    lokiService.saveDB();
  };

  updateNodeProperty = (propertyToUpdate, nodeId, newValue) => {
    // If debug, print out the property to update and the new value
    if (process.env.NODE_ENV === `development`) {
      console.log(`Updating ${propertyToUpdate} to ${newValue}`);
    }

    if (newValue == null) {
      // print error to console
      console.error(`You must pass a value to updateNodeProperty`);
      return;
    }
    let nodeToReturn = null;
    lokiService.nodes
      .chain()
      .find({ id: nodeId })
      .update(function (node) {
        node[propertyToUpdate] = newValue;
        nodeToReturn = node;
      });

    lokiService.saveDB();
    return nodeToReturn;
  };
}

// create one instance of the class to export so everyone can share it
const nodeService = new NodeService();
export default nodeService;
