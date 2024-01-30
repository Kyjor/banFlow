import { ipcRenderer } from 'electron';
import lokiService from './LokiService';

const TimerService = {
  getTimerPreferences() {
    // const { timerPreferences } = lokiService;
    // return timerPreferences.data[0];
    return {
      time: 25,
      shortBreak: 5,
      longBreak: 10,
      autoCycle: false,
    };
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
