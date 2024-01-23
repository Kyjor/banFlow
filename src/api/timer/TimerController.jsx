import timerService from '../../services/TimerService';

const TimerController = {
  getTimerPreferences() {
    return timerService.getTimerPreferences();
  },

  updateTimerPreferenceProperty(propertyToUpdate, newValue) {
    return timerService.updateTimerPreferenceProperty(
      propertyToUpdate,
      newValue,
    );
  },
};

export default TimerController;
