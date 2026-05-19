import Loki from 'lokijs';
import { tauriInvoke } from '../utils/tauri';

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
    this.gitRepositories = null;
    this.projectName = projectName;
    this.isSelectedFromDialog = false;
    this.isDev = null;
    this.isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
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

    this.gitRepositories = this.db.getCollection('gitRepositories');
    if (!this.gitRepositories) {
      this.gitRepositories = this.db.addCollection('gitRepositories');
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
  init = async (cb) => {
    console.log('[LokiService] init() called for project:', this.projectName);
    // force this.projectName to a string
    this.projectName = this.projectName.toString();
    console.log('[LokiService] isTauri:', this.isTauri);

    if (this.isTauri) {
      // In Tauri: Load file through Tauri command, then initialize LokiJS in-memory
      try {
        console.log('[LokiService] Loading database via Tauri for project:', this.projectName);
        // Load the database file content through Tauri
        const dbContent = await tauriInvoke('loki:loadDatabase', { projectName: this.projectName });
        console.log('[LokiService] Database loaded, length:', dbContent?.length || 0);
        
        // Create in-memory LokiJS database
        console.log('[LokiService] Creating in-memory LokiJS database');
        this.db = new Loki(this.projectName, {
          adapter: new Loki.LokiMemoryAdapter(),
          serializationMethod: 'pretty',
          verbose: true,
        });

        // Load the database content if it exists
        if (dbContent && dbContent.trim()) {
          try {
            console.log('[LokiService] Parsing database JSON');
            const dbData = JSON.parse(dbContent);
            console.log('[LokiService] Loading database into LokiJS');
            this.db.loadJSONObject(dbData);
            console.log('[LokiService] Database loaded, collections:', this.db.collections.map(c => c.name));
          } catch (parseError) {
            console.warn('[LokiService] Failed to parse existing database, starting fresh:', parseError);
          }
        } else {
          console.log('[LokiService] Empty or no database content, starting fresh');
        }

        // Initialize collections
        console.log('[LokiService] Initializing collections');
        this.dbInitialized();
        console.log('[LokiService] Collections initialized:', this.db.collections.map(c => `${c.name}(${c.data.length})`));

        // Save initial state if needed
        const needsSave = this.db.collections.length === 0 || this.db.collections.every(c => c.data.length === 0);
        if (needsSave) {
          console.log('[LokiService] New database, saving initial state');
          await this.saveDB();
        }

        console.log('[LokiService] Initialization complete, calling callback');
        if (cb) {
          cb();
        }
      } catch (error) {
        console.error('[LokiService] Failed to load database in Tauri:', error);
        console.error('[LokiService] Error stack:', error.stack);
        // Fallback: create empty database
        console.log('[LokiService] Creating fallback empty database');
        this.db = new Loki(this.projectName, {
          adapter: new Loki.LokiMemoryAdapter(),
          serializationMethod: 'pretty',
          verbose: true,
        });
        this.dbInitialized();
        console.log('[LokiService] Fallback database initialized');
        if (cb) {
          cb();
        }
      }
    } else {
      // Electron: Use file-based LokiJS (original behavior)
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
    }

    return this;
  };

  saveDB = async () => {
    console.log('[LokiService] saveDB() called');
    if (this.isTauri) {
      // Persistence is handled by Rust Tauri commands (api:createNode, etc.).
      // Writing from stale in-memory Loki state was corrupting project JSON files.
      return;
    } else {
      // Electron: Use LokiJS's built-in save
      this.db.saveDatabase((err) => {
        if (err) {
          console.log(`[LokiService] error : ${err}`);
        } else {
          console.log('[LokiService] database saved.');
        }
      });
    }
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
