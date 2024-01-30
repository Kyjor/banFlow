const TimerService = {
  getTimerPreferences(lokiService) {
    const { timerPreferences } = lokiService;
    return timerPreferences.data[0];
  },

  updateTimerPreferenceProperty(lokiService, propertyToUpdate, newValue) {
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
