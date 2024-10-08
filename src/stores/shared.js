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
