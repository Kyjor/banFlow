import timerService from '../../services/TimerService';

/**
 * @class TimerController
 * @desc creates a new Timer with a set of given properties
 */
class TimerController {
  getTimerPreferences = () => {
    return timerService.getTimerPreferences();
  };

  createDefaultTimerPreferences = () => {
    return timerService.createDefaultTimerPreferences();
  };

  updateTimerPreferenceProperty = (propertyToUpdate, newValue) => {
    return timerService.updateTimerPreferenceProperty(
      propertyToUpdate,
      newValue,
    );
  };
}

// create one instance of the class to export so everyone can share it
const timerController = new TimerController();
export default timerController;
