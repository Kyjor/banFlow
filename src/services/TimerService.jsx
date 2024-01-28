import lokiService from './LokiService';
import { ipcRenderer } from 'electron';

const TimerService = {
  getTimerPreferences() {
    // const { timerPreferences } = lokiService;
    // return timerPreferences.data[0];
    return ipcRenderer.invoke('api:getTimerPreferences');
  },

  updateTimerPreferenceProperty(propertyToUpdate, newValue) {
    const { timerPreferences } = lokiService;

    timerPreferences
      .chain()
      .find({ $loki: 1 })
      .update((preference) => {
        preference[propertyToUpdate] = newValue;
      });

    lokiService.saveDB();
    return timerPreferences.data[0];
  },
};

export default TimerService;
