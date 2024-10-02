import { ipcRenderer } from 'electron';

/**
 * @class IterationController
 * @desc Interacts with the ipcRenderer to perform CRUD operations on nodes. This is the interface between the UI and the database.
 */
const IterationController = {
  /**
   * @function getIterations
   * @desc gets all iterations
   * @route Iteration
   * @returns {array} iteration - all iterations
   * @permission {Read}
   */
  getIterations() {
    return ipcRenderer.sendSync('api:getIterations');
  },

  /**
   * @function createIteration
   * @desc creates a new Iteration with a set of given properties
   * @route Iterations
   * @param {string} iterationTitle - the title of the iteration.
   * @returns {object} iteration - the newly created iteration
   * @permission {Modification}
   */
  createIteration(iterationTitle) {
    return ipcRenderer.sendSync('api:createIteration', iterationTitle);
  },

  deleteIteration(iterationId) {
    ipcRenderer.sendSync('api:deleteIteration', iterationId);
  },

  selectIteration(iterationId) {
    ipcRenderer.sendSync('api:selectIteration', iterationId);
  },

  updateIterationProperty(propertyToUpdate, iterationId, newValue) {
    return ipcRenderer.sendSync(
      'api:updateIterationProperty',
      propertyToUpdate,
      iterationId,
      newValue,
    );
  },
};

export default IterationController;
