import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';

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
  async getIterations() {
    return await tauriSendSync('api:getIterations');
  },

  /**
   * @function createIteration
   * @desc creates a new Iteration with a set of given properties
   * @route Iterations
   * @param {string} iterationTitle - the title of the iteration.
   * @returns {object} iteration - the newly created iteration
   * @permission {Modification}
   */
  async createIteration(iterationTitle) {
    return await tauriSendSync('api:createIteration', iterationTitle);
  },

  async deleteIteration(iterationId) {
    await tauriSendSync('api:deleteIteration', iterationId);
  },

  async selectIteration(iterationId) {
    await tauriSendSync('api:selectIteration', iterationId);
  },

  async updateIterationProperty(propertyToUpdate, iterationId, newValue) {
    return await tauriSendSync(
      'api:updateIterationProperty',
      propertyToUpdate,
      iterationId,
      newValue,
    );
  },
};

export default IterationController;
