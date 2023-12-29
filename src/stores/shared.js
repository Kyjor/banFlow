import nodeController from '../api/nodes/NodeController';
import parentController from '../api/parent/ParentController';
import projectController from '../api/project/ProjectController';
import timerController from '../api/timer/TimerController';
import metadataController from '../api/metadata/MetadataController';
import tagController from '../api/tag/TagController';

import lokiService from '../services/LokiService'; // or wherever the above file is stored

module.exports.initialIndividualProjectState = {
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

module.exports.lokiService = { lokiService };

module.exports.controllers = {
  metadataController,
  nodeController,
  parentController,
  projectController,
  tagController,
  timerController,
};
