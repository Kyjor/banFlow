import timerService from '../../services/TimerService';

const TimerController = {
  async getTimerPreferences() {
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
