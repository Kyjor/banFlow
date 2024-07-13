const IterationService = {
  /**
   * @function getIterations
   * @desc gets all iterations
   * @route Iteration
   * @returns {array} iteration - all iterations
   * @permission {Read}
   */
  getIterations(lokiService) {
    const iterations = lokiService.iterations.find({ Id: { $ne: null } });

    let response = {};

    iterations.forEach((iteration) => {
      response = {
        ...response,
        [iteration.id]: {
          ...iteration,
        },
      };
    });

    return response;
  },

  createIteration(lokiService, iterationTitle) {
    const { iterations } = lokiService;

    const nextId = iterations.data.length
      ? iterations.chain().simplesort('$loki', true).data()[0].$loki + 1
      : 1;
    const newIteration = iterations.insert({
      id: `iteration-${nextId}`,
      title: iterationTitle,
      startDate: null,
      endDate: null,
      isComplete: false,
    });
    lokiService.saveDB();

    return newIteration;
  },

  deleteIteration(lokiService, iterationId) {
    const { iterations, iterationOrder } = lokiService;

    iterationOrder.chain().find({ iterationId }).remove();
    iterations
      .chain()
      .find({ id: iterationId })
      .find({ id: iterationId })
      .remove();

    lokiService.saveDB();
  },

  updateIterationProperty(
    lokiService,
    propertyToUpdate,
    iterationId,
    newValue,
  ) {
    let iterationToReturn = null;
    lokiService.iterations
      .chain()
      .find({ id: iterationId })
      .update((iteration) => {
        iteration[propertyToUpdate] = newValue;
        iterationToReturn = iteration;
      });

    lokiService.saveDB();
    return iterationToReturn;
  },
};

export default IterationService;
