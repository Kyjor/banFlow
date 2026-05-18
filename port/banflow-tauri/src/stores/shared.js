export const defaultTimerPreferences = {
  time: 25,
  shortBreak: 5,
  longBreak: 10,
  autoCycle: false,
};

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
