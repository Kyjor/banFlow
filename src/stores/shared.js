module.exports.individualProjectState = {
  nodes: {},
  parents: {},
  parentOrder: [],
  parentModalVisible: false,
  visible: false,
  modalParent: null,
  modalNode: null,
  NodeTitleSelected: false,
  modalTitleSelected: false,
  modalDescriptionSelected: false,
  modalNotesSelected: false,
  mustFocusNodeTitle: false,
  mustFocusParentTitle: false,
  tags: [],
  timerPreferences: null,
  currentNodeSelectedInTimer: null,
  currentProjectName: '',
};

module.exports.defaultTimerPreferences = {
  time: 25,
  shortBreak: 5,
  longBreak: 10,
  autoCycle: false,
};
