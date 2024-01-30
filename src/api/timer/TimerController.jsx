import { ipcRenderer } from 'electron';

/**
 * @class TimerController
 * @desc Interacts with the ipcRenderer to perform CRUD operations on timer preferences. This is the interface between the UI and the database.
 */
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
