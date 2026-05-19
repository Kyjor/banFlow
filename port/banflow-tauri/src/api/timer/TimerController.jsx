import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';
import { normalizeTimerPreferences } from '../../stores/shared';

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
    const prefs = await tauriInvoke('api:getTimerPreferences', { projectName });
    return normalizeTimerPreferences(prefs);
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
    const normalized = normalizeTimerPreferences(prefs);
    const entries = [
      ['time', normalized.time],
      ['shortBreak', normalized.shortBreak],
      ['longBreak', normalized.longBreak],
      ['autoCycle', normalized.autoCycle],
    ];
    let latest = normalized;
    for (const [property, value] of entries) {
      const updated = await this.updateTimerPreferenceProperty(property, value);
      if (updated) {
        latest = normalizeTimerPreferences(updated);
      }
    }
    return latest;
  },
};

export default TimerController;
