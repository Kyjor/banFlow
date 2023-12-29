import lokiService from './LokiService';

/**
 * @class TimerService
 * @desc creates a new Timer with a set of given properties
 */
class TimerService {
  getTimerPreferences = () => {
    const { timerPreferences } = lokiService;
    return timerPreferences.data[0];
  };

  updateTimerPreferenceProperty = (propertyToUpdate, newValue) => {
    const { timerPreferences } = lokiService;

    timerPreferences
      .chain()
      .find({ $loki: 1 })
      .update(function (preference) {
        preference[propertyToUpdate] = newValue;
      });

    lokiService.saveDB();
    return timerPreferences.data[0];
  };
}

// create one instance of the class to export so everyone can share it
const timerService = new TimerService();
export default timerService;
