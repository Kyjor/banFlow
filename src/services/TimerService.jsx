import lokiService from './LokiService';

/**
 * @class TimerService
 * @desc creates a new Timer with a set of given properties
 */
const TimerService = {
  getTimerPreferences() {
    const { timerPreferences } = lokiService;
    return timerPreferences.data[0];
  },

  updateTimerPreferenceProperty(propertyToUpdate, newValue) {
    const { timerPreferences } = lokiService;

    timerPreferences
      .chain()
      .find({ $loki: 1 })
      .update(function (preference) {
        preference[propertyToUpdate] = newValue;
      });

    lokiService.saveDB();
    return timerPreferences.data[0];
  },
};

export default TimerService;
