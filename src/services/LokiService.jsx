const Loki = require('lokijs');

export default class LokiService {
  constructor(projectName) {
    this.db = null;
    this.iterations = null;
    this.nodes = null;
    this.parents = null;
    this.parentOrder = null;
    this.projectSettings = null;
    this.tags = null;
    this.nodeStates = null;
    this.nodeTypes = null;
    this.timerPreferences = null;
    this.projectName = projectName;
    this.isSelectedFromDialog = false;
    this.isDev = null;
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
        .update((node) => {
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

    this.iterations = this.db.getCollection('iterations');
    if (!this.iterations) {
      this.iterations = this.db.addCollection('iterations');
      mustSaveDatabase = true;
    }

    this.timerPreferences = this.db.getCollection('timerPreferences');
    if (!this.timerPreferences) {
      this.timerPreferences = this.db.addCollection('timerPreferences');
      this.createDefaultTimerPreferences();
      mustSaveDatabase = true;
    }

    this.projectSettings = this.db.getCollection('projectSettings');
    if (!this.projectSettings) {
      this.projectSettings = this.db.addCollection('projectSettings');
      this.createDefaultProjectSettings();
      mustSaveDatabase = true;
    }

    if (mustSaveDatabase) {
      this.saveDB();
    }
  };

  /**
   * @function init
   * @desc call on startup of app to initialize Loki
   */
  init = (cb) => {
    // force this.projectName to a string
    this.projectName = this.projectName.toString();

    const path =
      // if projectname contains slashes, use it as the path
      this.projectName.indexOf('/') !== -1 ||
      this.projectName.indexOf('\\') !== -1 ||
      this.projectName.indexOf(':') !== -1
        ? this.projectName
        : `../banFlowProjects/${this.projectName}.json`;

    this.db = new Loki(path, {
      // options
      autoload: true,
      autosave: true,
      serializationMethod: 'pretty',
      verbose: true,
      autosaveInterval: 600000,
      autoloadCallback: () => {
        this.dbInitialized();
        if (cb) {
          cb();
        }
      },
    });

    return this;
  };

  saveDB = () => {
    this.db.saveDatabase((err) => {
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

  createDefaultProjectSettings = () => {
    const { projectSettings } = this;
    const newSettings = projectSettings.insert({
      trello: {},
    });

    this.saveDB();
    return newSettings;
  };
}
