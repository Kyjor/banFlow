import timerService from '../../services/TimerService';

/**
 * @class TimerController
 * @desc creates a new Timer with a set of given properties
 */
const TimerController = {
  getTimerPreferences() {
    return timerService.getTimerPreferences();
  },

  createDefaultTimerPreferences() {
    return timerService.createDefaultTimerPreferences();
  },

  updateTimerPreferenceProperty(propertyToUpdate, newValue) {
    return timerService.updateTimerPreferenceProperty(
      propertyToUpdate,
      newValue,
    );
  },
};

export default TimerController;
