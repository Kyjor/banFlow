import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';

/**
 * @class TimerController
 * @desc Interacts with the ipcRenderer to perform CRUD operations on timer preferences. This is the interface between the UI and the database.
 */
const TimerController = {
  async getTimerPreferences() {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[TimerController] No project name found');
      return null;
    }
    return await tauriInvoke('api:getTimerPreferences', { projectName });
  },

  async updateTimerPreferenceProperty(propertyToUpdate, newValue) {
    const projectName = localStorage.getItem('currentProject') || '';
    if (!projectName) {
      console.error('[TimerController] No project name found');
      return null;
    }
    return await tauriInvoke('api:updateTimerPreferenceProperty', {
      projectName,
      propertyToUpdate,
      newValue,
    });
  },

  async saveTimerPreferences(prefs) {
    const entries = [
      ['time', prefs.time],
      ['shortBreak', prefs.shortBreak],
      ['longBreak', prefs.longBreak],
      ['autoCycle', prefs.autoCycle],
    ];
    for (const [property, value] of entries) {
      await this.updateTimerPreferenceProperty(property, value);
    }
    return prefs;
  },
};

export default TimerController;
