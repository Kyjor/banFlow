import { ipcRenderer } from 'electron';

const loki = require('lokijs');

class LokiService {
  constructor(props) {
    this.db = null;
    this.nodes = null;
    this.parents = null;
    this.parentOrder = null;
    this.tags = null;
    this.nodeStates = null;
    this.nodeTypes = null;
    this.timerPreferences = null;
    this.projectName = '';
    this.isSelectedFromDialog = false;
    this.isDev = null;
    const self = this;
  }

  /**
   * @function dbInitialized
   * @desc used when Loki is done initializing the local instance
   */
  dbInitialized = () => {
    let mustSaveDatabase = false;
    this.parentOrder = this.db.getCollection('parentOrder');
    if (!this.parentOrder) {
      this.parentOrder = this.db.addCollection('parentOrder');
      mustSaveDatabase = true;
    }
    this.parents = this.db.getCollection('parents');
    if (!this.parents) {
      this.parents = this.db.addCollection('parents');
      mustSaveDatabase = true;
    }
    this.nodes = this.db.getCollection('nodes');
    if (!this.nodes) {
      this.nodes = this.db.addCollection('nodes');
      mustSaveDatabase = true;
    } else if (this.nodes) {
      this.nodes
        .chain()
        .find({ Id: { $ne: null } })
        .update(function (node) {
          if (!node.checklist) {
            node.checklist = {
              title: `Checklist`,
              checks: [],
              timeSpent: 0,
            };
          }
        });
    }
    this.nodeTypes = this.db.getCollection('nodeTypes');
    if (!this.nodeTypes) {
      this.nodeTypes = this.db.addCollection('nodeTypes');
      // TODO: Save default metadata values
      mustSaveDatabase = true;
    }

    this.nodeStates = this.db.getCollection('nodeStates');
    if (!this.nodeStates) {
      this.nodeStates = this.db.addCollection('nodeStates');
      // TODO: Save default metadata values
      mustSaveDatabase = true;
    }
    this.tags = this.db.getCollection('tags');
    if (!this.tags) {
      this.tags = this.db.addCollection('tags');
      mustSaveDatabase = true;
    }
    this.timerPreferences = this.db.getCollection('timerPreferences');
    if (!this.timerPreferences) {
      this.timerPreferences = this.db.addCollection('timerPreferences');
      this.createDefaultTimerPreferences();
      mustSaveDatabase = true;
    }

    if (mustSaveDatabase) {
      console.log('save db');
      this.saveDB();
    }
  };

  /**
   * @function init
   * @desc call on startup of app to initialize Loki
   */
  init = (cb) => {
    const path =
      // if projectname contains slashes, use it as the path
      this.projectName.indexOf('/') !== -1 ||
      this.projectName.indexOf('\\') !== -1
        ? this.projectName
        : `../banFlowProjects/${this.projectName}.json`;

    this.db = new loki(path, {
      // options
      autoload: true,
      autosave: true,
      verbose: true,
      autosaveInterval: 600000,
      autoloadCallback: () => {
        this.dbInitialized();
        !!cb && cb();
      },
    });
  };

  saveDB = () => {
    this.db.saveDatabase(function (err) {
      if (err) {
        console.log(`error : ${err}`);
      } else {
        console.log('database saved.');
      }
    });
  };

  createDefaultTimerPreferences = () => {
    const { timerPreferences } = this;
    const newPreferences = timerPreferences.insert({
      time: 25,
      shortBreak: 5,
      longBreak: 10,
      autoCycle: false,
    });

    this.saveDB();
    return newPreferences;
  };
}

// create one instance of the class to export so everyone can share it
const lokiService = new LokiService();
export default lokiService;
