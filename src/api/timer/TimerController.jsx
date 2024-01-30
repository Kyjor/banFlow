import { ipcRenderer } from 'electron';

const TimerController = {
  getTimerPreferences() {
    return ipcRenderer.sendSync('api:getTimerPreferences');
  },

  updateTimerPreferenceProperty(propertyToUpdate, newValue) {
    return ipcRenderer.sendSync(
      'api:updateTimerPreferenceProperty',
      propertyToUpdate,
      newValue,
    );
  },
};

export default TimerController;
