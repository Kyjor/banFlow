export const defaultTimerPreferences = {
  time: 25,
  shortBreak: 5,
  longBreak: 10,
  autoCycle: false,
};

/** Normalize DB / Rust timer prefs to the shape the UI expects. */
export function normalizeTimerPreferences(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...defaultTimerPreferences };
  }
  return {
    time: Number(raw.time ?? defaultTimerPreferences.time),
    shortBreak: Number(
      raw.shortBreak ?? raw.short_break ?? defaultTimerPreferences.shortBreak,
    ),
    longBreak: Number(
      raw.longBreak ?? raw.long_break ?? defaultTimerPreferences.longBreak,
    ),
    autoCycle: Boolean(
      raw.autoCycle ?? raw.auto_cycle ?? defaultTimerPreferences.autoCycle,
    ),
  };
}

export const individualProjectState = {
  currentNodeSelectedInTimer: null,
  currentProjectName: '',
  iterations: {},
  lokiLoaded: false,
  modalDescriptionSelected: false,
  modalParent: null,
  modalNode: null,
  modalNotesSelected: false,
  modalTitleSelected: false,
  mustFocusNodeTitle: false,
  mustFocusParentTitle: false,
  nodes: {},
  parentModalVisible: false,
  parentOrder: [],
  parents: {},
  projectSettings: {},
  NodeTitleSelected: false,
  tags: [],
  timerPreferences: defaultTimerPreferences,
  visible: false,
};

// Shared state store for LokiService
const sharedState = {
  currentLokiService: null,
};

export const getCurrentLokiService = () => sharedState.currentLokiService;

export const setCurrentLokiService = (lokiService) => {
  sharedState.currentLokiService = lokiService;
};
