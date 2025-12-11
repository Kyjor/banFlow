/* eslint-disable no-use-before-define,@typescript-eslint/no-unused-vars */
/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  protocol,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import * as remoteMain from '@electron/remote/main';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import { individualProjectState } from '../stores/shared';
import MenuBuilder from './menu';
import { pathCreator } from './util';
import LokiService from '../services/LokiService';
import NodeService from '../services/NodeService';
import ParentService from '../services/ParentService';
import ProjectService from '../services/ProjectService';
import MetadataService from '../services/MetadataService';
import TagService from '../services/TagService';
import TimerService from '../services/TimerService';
import IterationService from '../services/IterationService';
import GitService from '../services/GitService';
import GitRepositoryService from '../services/GitRepositoryService';

remoteMain.initialize();
let mainWindow: BrowserWindow | null = null;
// eslint-disable-next-line no-undef
let timerWindow: BrowserWindow | Electron.PopupOptions | null | undefined;
let individualProjectStateValue: any = individualProjectState;
let lastOpenedTimes = {};

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''));
    callback(pathname);
  });

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 850,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      webSecurity: process.env.NODE_ENV !== 'development',
    },
  });
  remoteMain.enable(mainWindow.webContents);
  mainWindow.loadURL(pathCreator('app'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.webContents.send('IsDev', !app.isPackaged);
      console.log(isDebug);
      mainWindow.show();
    }
  });

  mainWindow.on('close', function (e) {
    if (mainWindow) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message: 'Are you sure you want to quit?',
      });
      if (choice === 1) {
        e.preventDefault();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
    ipcMain.handle('api:getProjectState', getProjectState);
    ipcMain.handle('api:setProjectState', setProjectState);
    ipcMain.handle('api:createNode', createNode);
    ipcMain.handle('api:initializeProjectState', initializeProjectState);
    
    // Initialize backup schedules after a short delay to ensure everything is loaded
    setTimeout(() => {
      const fs = require('fs');
      const path = require('path');
      const projectsDir = path.join(__dirname, '../../banFlowProjects');
      if (fs.existsSync(projectsDir)) {
        const files = fs.readdirSync(projectsDir);
        files.forEach((file: string) => {
          if (file.endsWith('.json') && !file.startsWith('_') && file !== 'appSettings.json') {
            const projectName = file.replace('.json', '');
            // Default settings: enabled, 24 hours, 10 backups
            // The renderer will update these when settings are loaded
            startBackupSchedule(projectName, 24, 10);
          }
        });
      }
    }, 2000);
    
    // Game state IPC handlers
    ipcMain.handle('game:getState', async () => {
      try {
        const fs = require('fs');
        const path = require('path');
        const gameStatePath = path.join(__dirname, '../../banFlowProjects/_gameState.json');
        if (fs.existsSync(gameStatePath)) {
          const data = fs.readFileSync(gameStatePath, 'utf8');
          return JSON.parse(data);
        }
        return null;
      } catch (error) {
        console.error('Error loading game state:', error);
        return null;
      }
    });
    
    ipcMain.handle('game:saveState', async (event, state) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const projectsDir = path.join(__dirname, '../../banFlowProjects');
        if (!fs.existsSync(projectsDir)) {
          fs.mkdirSync(projectsDir, { recursive: true });
        }
        const gameStatePath = path.join(projectsDir, '_gameState.json');
        fs.writeFileSync(gameStatePath, JSON.stringify(state, null, 2), 'utf8');
        return true;
      } catch (error) {
        console.error('Error saving game state:', error);
        return false;
      }
    });
  })
  .catch(console.log);

ipcMain.on(
  'MSG_FROM_RENDERER',
  (_event, node, projectName, stateInit, timerPrefs) => {
    // @ts-ignore
    mainWindow.webContents.send(
      'MSG_FROM_RENDERER',
      '(_event, node, projectName, stateInit, timerPrefs, controllers)',
    );
    createTimerWindow(node, projectName, stateInit, timerPrefs);
  },
);

ipcMain.on('SaveNodeTime', (_event, nodeId, seconds) => {
  // @ts-ignore
  mainWindow.webContents.send('SaveNodeTime', nodeId, seconds);
});

ipcMain.on('GetProjectFile', () => {
  const fileName = dialog.showOpenDialogSync({
    properties: ['openFile'],
  });
  // @ts-ignore
  mainWindow.webContents.send('ReturnProjectFile', fileName);
});

function createTimerWindow(
  node: any,
  projectName: any,
  stateInit: any,
  timerPrefs: any,
) {
  if (timerWindow) {
    // TODO: add an event that sends an alert to the main window telling the user the below message
    console.log('There is already a timer window open. Please close it first.');
    return;
  }
  Menu.setApplicationMenu(null);
  // Create the browser window.
  // @ts-ignore
  timerWindow = new BrowserWindow({
    width: 350,
    height: 250,
    titleBarStyle: 'customButtonsOnHover',
    frame: true,
    alwaysOnTop: true,
    show: true,
    resizable: true,
    transparent: true,

    // You need to activate `nativeWindowOpen`
    webPreferences: {
      nodeIntegration: true,
      // @ts-ignore
      nativeWindowOpen: true,
      enableRemoteModule: true,
      contextIsolation: false,
      webSecurity: process.env.NODE_ENV !== 'development',
    },
  });
  remoteMain.enable(timerWindow.webContents);

  timerWindow.loadURL(pathCreator('timer'));

  // Don't show until we are ready and loaded
  timerWindow.once('ready-to-show', () => {
    // @ts-ignore
    timerWindow.show();
    // @ts-ignore
    timerWindow.webContents.send('DefaultNode', node);
    // @ts-ignore
    timerWindow.webContents.send('RetrieveProjectName', projectName);
    // @ts-ignore
    timerWindow.webContents.send('RetrieveProjectState', stateInit);
    // @ts-ignore
    timerWindow.webContents.send('RetrieveTimerPrefs', timerPrefs);

    // Open the DevTools automatically if developing
    if (isDebug) {
      // @ts-ignore
      timerWindow.webContents.on('context-menu', (e, props) => {
        const { x, y } = props;

        // @ts-ignore
        Menu.buildFromTemplate([
          {
            label: 'Inspect element',
            click: () => {
              // @ts-ignore
              timerWindow.inspectElement(x, y);
            },
          },
          {
            label: 'Reload',
            click: () => {
              // @ts-ignore
              timerWindow.reload();
            },
          },
          {
            label: 'Back',
            click: () => {
              // @ts-ignore
              timerWindow.webContents.goBack();
            },
          },
        ]).popup(timerWindow);
      });
    }
  });
  timerWindow.on('close', function () {
    // @ts-ignore
    timerWindow.webContents.send('SaveBeforeClose');
  });

  // Emitted when the window is closed.
  timerWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    timerWindow = null;
  });
}
let currentLokiService: any;
const lokiServices: any = [];
ipcMain.on('InitializeLokiProject', (event, projectName) => {
  // set currentLokiService to the lokiService with the matching projectName
  currentLokiService = lokiServices.find(
    (lokiService: any) => lokiService.projectName === projectName,
  );
  if (!currentLokiService) {
    console.log('creating new loki service, didnt find one with that name');
    currentLokiService = new LokiService(projectName);
    // add currentLokiService to lokiServices
    lokiServices.push(currentLokiService);
  }

  individualProjectStateValue.projectName = projectName;
  currentLokiService.init(lokiLoadedCallback);
  event.returnValue = projectName;
});

const lokiLoadedCallback = () => {
  if (mainWindow) {
    mainWindow.webContents.send(
      'UpdateCurrentProject',
      individualProjectStateValue.projectName,
    );
  }
  if (mainWindow) {
    mainWindow.webContents.send(
      'UpdateProjectPageState',
      individualProjectStateValue.projectName,
    );
  }
};

ipcMain.on('InitializedLokiService', (_event, lokiService) => {
  currentLokiService = lokiService;
  // add currentLokiService to lokiServices
  lokiServices.push(currentLokiService);
});

// Todo: Consolidate these gets into one function
ipcMain.on('api:getNodesWithQuery', (event, query) => {
  if (!currentLokiService || !currentLokiService.nodes) {
    event.returnValue = {};
    return;
  }
  try {
    event.returnValue = NodeService.getNodesWithQuery(currentLokiService, query);
  } catch (error) {
    console.error('Error in api:getNodesWithQuery:', error);
    event.returnValue = {};
  }
});

ipcMain.on('api:getNodes', (event) => {
  if (!currentLokiService || !currentLokiService.nodes) {
    event.returnValue = {};
    return;
  }
  try {
    event.returnValue = NodeService.getNodes(currentLokiService);
  } catch (error) {
    console.error('Error in api:getNodes:', error);
    event.returnValue = {};
  }
});

ipcMain.on('utils:closeTimerWindow', (event) => {
  console.log('closing timer window');
  if (timerWindow) {
    timerWindow.close();
  }
  event.returnValue = null;
});

ipcMain.on('api:getNode', (event, nodeId) => {
  event.returnValue = NodeService.getNodesWithQuery(currentLokiService, nodeId);
});

const createNode = async (
  event,
  nodeType,
  nodeTitle,
  parentId,
  iterationId,
  trelloData,
  trelloAuth,
) => {
  try {
    // Await the result of the createNode call
    const result = await NodeService.createNode(
      currentLokiService,
      nodeType,
      nodeTitle,
      parentId,
      iterationId,
      trelloData,
      trelloAuth,
    );

    console.log('Node created:', result);
    return result;
  } catch (error) {
    console.error('Error creating node:', error);
  }
};

ipcMain.on('api:deleteNode', (event, nodeId, parentId) => {
  NodeService.deleteNode(currentLokiService, nodeId, parentId);
  event.returnValue = true;
});

ipcMain.on(
  'api:updateNodeProperty',
  (event, propertyToUpdate, nodeId, newValue, trelloAuth) => {
    event.returnValue = NodeService.updateNodeProperty(
      currentLokiService,
      propertyToUpdate,
      nodeId,
      newValue,
      trelloAuth,
    );
  },
);

ipcMain.on('api:getParents', (event) => {
  event.returnValue = ParentService.getParents(currentLokiService);
});

ipcMain.on('api:getParentOrder', (event) => {
  event.returnValue = ParentService.getParentOrder(currentLokiService);
});

ipcMain.on('api:createParent', (event, parentTitle, trelloData) => {
  event.returnValue = ParentService.createParent(
    currentLokiService,
    parentTitle,
    trelloData,
  );
});

ipcMain.on('api:deleteParent', (event, parentId) => {
  ParentService.deleteParent(currentLokiService, parentId);
  event.returnValue = true;
});

ipcMain.on(
  'api:updateParentProperty',
  (event, propertyToUpdate, parentId, newValue) => {
    event.returnValue = ParentService.updateParentProperty(
      currentLokiService,
      propertyToUpdate,
      parentId,
      newValue,
    );
  },
);

ipcMain.on('api:updateParentOrder', (event, parentOrder) => {
  ParentService.updateParentOrder(currentLokiService, parentOrder);
  event.returnValue = true;
});

ipcMain.on(
  'api:updateNodesInParents',
  (
    event,
    updatedOriginParent,
    updatedDestinationParent,
    nodeId,
    trelloAuth,
  ) => {
    ParentService.updateNodesInParents(
      currentLokiService,
      updatedOriginParent,
      updatedDestinationParent,
      nodeId,
      trelloAuth,
    );
    event.returnValue = true;
  },
);

ipcMain.on('api:initializeProjectState', (event, projectName: any) => {
  console.log('initializing project state');
  individualProjectStateValue.nodes = NodeService.getNodesWithQuery(
    currentLokiService,
    {
      Id: { $ne: null },
    },
  );
  individualProjectStateValue.parents =
    ParentService.getParents(currentLokiService);
  individualProjectStateValue.parentOrder =
    ParentService.getParentOrder(currentLokiService);
  individualProjectStateValue.iterations =
    IterationService.getIterations(currentLokiService);
  individualProjectStateValue.lokiLoaded = true;
  individualProjectStateValue.projectName = projectName;
  individualProjectStateValue.projectSettings =
    ProjectService.getProjectSettings(currentLokiService);

  event.returnValue = individualProjectStateValue;
});

// Metadata
ipcMain.on('api:saveMetadataValue', (event, enumValueTitle, parentEnum) => {
  MetadataService.saveMetadataValue(
    currentLokiService,
    enumValueTitle,
    parentEnum,
  );
  event.returnValue = true;
});

// Tags
ipcMain.on('api:getTags', (event) => {
  event.returnValue = TagService.getTags(currentLokiService);
});

ipcMain.on('api:addTag', (event, tagTitle, color = '') => {
  TagService.addTag(currentLokiService, tagTitle, color);
  event.returnValue = true;
});

ipcMain.on('api:updateTagColor', (event, tagTitle, color) => {
  TagService.updateTagColor(currentLokiService, tagTitle, color);
  event.returnValue = true;
});

// Timer
ipcMain.on('api:getTimerPreferences', (event) => {
  TimerService.getTimerPreferences(currentLokiService);
  event.returnValue = true;
});

ipcMain.on(
  'api:updateTimerPreferenceProperty',
  (event, propertyToUpdate, newValue) => {
    TimerService.updateTimerPreferenceProperty(
      currentLokiService,
      propertyToUpdate,
      newValue,
    );
    event.returnValue = true;
  },
);

ipcMain.on('api:getNodeTypes', (event) => {
  event.returnValue = NodeService.getNodeTypes(currentLokiService);
});

ipcMain.on('api:getNodeStates', (event) => {
  event.returnValue = NodeService.getNodeStates(currentLokiService);
});

// Iterations
ipcMain.on('api:getIterations', (event) => {
  event.returnValue = IterationService.getIterations(currentLokiService);
});

ipcMain.on('api:createIteration', (event, iterationTitle) => {
  event.returnValue = IterationService.createIteration(
    currentLokiService,
    iterationTitle,
  );
});

ipcMain.on('api:deleteIteration', (event, iterationId) => {
  IterationService.deleteIteration(currentLokiService, iterationId);
  event.returnValue = true;
});

ipcMain.on(
  'api:updateIterationProperty',
  (event, propertyToUpdate, iterationId, newValue) => {
    event.returnValue = IterationService.updateIterationProperty(
      currentLokiService,
      propertyToUpdate,
      iterationId,
      newValue,
    );
  },
);

ipcMain.on('api:setTrelloBoard', (event, trelloBoard) => {
  ProjectService.setTrelloBoard(currentLokiService, trelloBoard);
  event.returnValue = true;
});

ipcMain.on('api:getProjectSettings', (event) => {
  event.returnValue = ProjectService.getProjectSettings(currentLokiService);
});

ipcMain.handle('api:updateProjectSettings', async (event, projectName: string, settings: any) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const Loki = require('lokijs');
    
    const projectPath = projectName.includes('/') || projectName.includes('\\') || projectName.includes(':')
      ? projectName
      : path.join(__dirname, '../../banFlowProjects', `${projectName}.json`);
    
    return new Promise((resolve, reject) => {
      const db = new Loki(projectPath, {
        autoload: true,
        autosave: true,
        verbose: false,
        autoloadCallback: () => {
          try {
            let projectSettings = db.getCollection('projectSettings');
            if (!projectSettings) {
              projectSettings = db.addCollection('projectSettings');
            }
            
            const existing = projectSettings.findOne({});
            if (existing) {
              projectSettings.update({ ...existing, ...settings });
            } else {
              projectSettings.insert(settings);
            }
            
            db.saveDatabase((err) => {
              if (err) {
                reject(err);
              } else {
                resolve({ success: true });
              }
            });
          } catch (error) {
            reject(error);
          }
        },
      });
    });
  } catch (error) {
    console.error('Error updating project settings:', error);
    throw error;
  }
});

ipcMain.handle('app:getDataPath', async () => {
  const path = require('path');
  return path.join(__dirname, '../../banFlowProjects');
});

ipcMain.handle('app:openDataPath', async () => {
  const { shell } = require('electron');
  const path = require('path');
  const dataPath = path.join(__dirname, '../../banFlowProjects');
  shell.openPath(dataPath);
  return { success: true };
});

// ==================== BACKUP & RECOVERY SYSTEM ====================

let backupIntervals: Map<string, NodeJS.Timeout> = new Map();
let backupTimers: Map<string, NodeJS.Timeout> = new Map();

const getBackupPath = (projectName: string) => {
  const fs = require('fs');
  const path = require('path');
  const backupDir = path.join(__dirname, '../../banFlowProjects', '_backups', projectName);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

const getAllBackupsPath = () => {
  const fs = require('fs');
  const path = require('path');
  const backupDir = path.join(__dirname, '../../banFlowProjects', '_backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

const createBackup = async (projectName: string): Promise<string> => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const projectPath = projectName.includes('/') || projectName.includes('\\') || projectName.includes(':')
      ? projectName
      : path.join(__dirname, '../../banFlowProjects', `${projectName}.json`);
    
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project file not found: ${projectPath}`);
    }
    
    const backupDir = getBackupPath(projectName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${projectName}_${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Copy the project file
    fs.copyFileSync(projectPath, backupPath);
    
    // Also backup associated folders (docs, images, diagrams) if they exist
    const projectBasePath = path.dirname(projectPath);
    const projectFolderName = path.basename(projectPath, '.json');
    const projectFolder = path.join(projectBasePath, projectFolderName);
    
    if (fs.existsSync(projectFolder) && fs.statSync(projectFolder).isDirectory()) {
      const backupProjectFolder = path.join(backupDir, `${projectFolderName}_${timestamp}`);
      if (fs.existsSync(backupProjectFolder)) {
        fs.rmSync(backupProjectFolder, { recursive: true, force: true });
      }
      fs.mkdirSync(backupProjectFolder, { recursive: true });
      
      // Copy all subdirectories
      const copyDir = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      
      copyDir(projectFolder, backupProjectFolder);
    }
    
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};

const cleanupOldBackups = async (projectName: string, maxBackups: number) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const backupDir = getBackupPath(projectName);
    if (!fs.existsSync(backupDir)) {
      return;
    }
    
    const files = fs.readdirSync(backupDir);
    const backupFiles = files
      .filter((file: string) => file.endsWith('.json'))
      .map((file: string) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          created: stats.birthtime,
        };
      })
      .sort((a: any, b: any) => b.created.getTime() - a.created.getTime());
    
    // Keep only the most recent maxBackups
    if (backupFiles.length > maxBackups) {
      const toDelete = backupFiles.slice(maxBackups);
      for (const backup of toDelete) {
        try {
          fs.unlinkSync(backup.path);
          // Also delete associated folder if it exists
          const folderName = backup.name.replace('.json', '');
          const folderPath = path.join(backupDir, folderName);
          if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
            fs.rmSync(folderPath, { recursive: true, force: true });
          }
        } catch (err) {
          console.error(`Error deleting backup ${backup.name}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up backups:', error);
  }
};

const startBackupSchedule = (projectName: string, intervalHours: number, maxBackups: number) => {
  // Clear existing interval if any
  if (backupIntervals.has(projectName)) {
    clearInterval(backupIntervals.get(projectName)!);
  }
  
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  const performBackup = async () => {
    try {
      await createBackup(projectName);
      await cleanupOldBackups(projectName, maxBackups);
      console.log(`Backup created for project: ${projectName}`);
    } catch (error) {
      console.error(`Error in scheduled backup for ${projectName}:`, error);
    }
  };
  
  // Perform initial backup
  performBackup();
  
  // Schedule recurring backups
  const interval = setInterval(performBackup, intervalMs);
  backupIntervals.set(projectName, interval);
};

const stopBackupSchedule = (projectName: string) => {
  if (backupIntervals.has(projectName)) {
    clearInterval(backupIntervals.get(projectName)!);
    backupIntervals.delete(projectName);
  }
};

// IPC Handlers for backup system
ipcMain.handle('backup:create', async (event, projectName: string) => {
  try {
    const backupPath = await createBackup(projectName);
    return { success: true, path: backupPath };
  } catch (error) {
    console.error('Error creating backup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:list', async (event, projectName: string | null = null) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    if (projectName) {
      const backupDir = getBackupPath(projectName);
      if (!fs.existsSync(backupDir)) {
        return [];
      }
      
      const files = fs.readdirSync(backupDir);
      return files
        .filter((file: string) => file.endsWith('.json'))
        .map((file: string) => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            projectName,
            size: stats.size,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
          };
        })
        .sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
    } else {
      // List all backups
      const allBackupsDir = getAllBackupsPath();
      if (!fs.existsSync(allBackupsDir)) {
        return [];
      }
      
      const projects = fs.readdirSync(allBackupsDir);
      const allBackups: any[] = [];
      
      for (const project of projects) {
        const projectBackupDir = path.join(allBackupsDir, project);
        if (fs.statSync(projectBackupDir).isDirectory()) {
          const files = fs.readdirSync(projectBackupDir);
          files
            .filter((file: string) => file.endsWith('.json'))
            .forEach((file: string) => {
              const filePath = path.join(projectBackupDir, file);
              const stats = fs.statSync(filePath);
              allBackups.push({
                name: file,
                path: filePath,
                projectName: project,
                size: stats.size,
                created: stats.birthtime.toISOString(),
                modified: stats.mtime.toISOString(),
              });
            });
        }
      }
      
      return allBackups.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
    }
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
});

ipcMain.handle('backup:restore', async (event, backupPath: string, projectName: string) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    const projectPath = projectName.includes('/') || projectName.includes('\\') || projectName.includes(':')
      ? projectName
      : path.join(__dirname, '../../banFlowProjects', `${projectName}.json`);
    
    // Create a safety backup before restoring
    const safetyBackupPath = `${projectPath}.pre-restore-${Date.now()}`;
    if (fs.existsSync(projectPath)) {
      fs.copyFileSync(projectPath, safetyBackupPath);
    }
    
    try {
      // Restore the main project file
      fs.copyFileSync(backupPath, projectPath);
      
      // Restore associated folders if they exist in the backup
      const backupDir = path.dirname(backupPath);
      const backupFileName = path.basename(backupPath, '.json');
      const backupProjectFolder = path.join(backupDir, backupFileName);
      
      if (fs.existsSync(backupProjectFolder) && fs.statSync(backupProjectFolder).isDirectory()) {
        const projectBasePath = path.dirname(projectPath);
        const projectFolderName = path.basename(projectPath, '.json');
        const projectFolder = path.join(projectBasePath, projectFolderName);
        
        // Remove existing project folder
        if (fs.existsSync(projectFolder)) {
          fs.rmSync(projectFolder, { recursive: true, force: true });
        }
        
        // Copy backup folder
        const copyDir = (src: string, dest: string) => {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }
          const entries = fs.readdirSync(src, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          }
        };
        
        copyDir(backupProjectFolder, projectFolder);
      }
      
      return { success: true, safetyBackup: safetyBackupPath };
    } catch (error) {
      // Restore safety backup if restore failed
      if (fs.existsSync(safetyBackupPath)) {
        fs.copyFileSync(safetyBackupPath, projectPath);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:delete', async (event, backupPath: string) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    fs.unlinkSync(backupPath);
    
    // Also delete associated folder if it exists
    const backupDir = path.dirname(backupPath);
    const backupFileName = path.basename(backupPath, '.json');
    const backupProjectFolder = path.join(backupDir, backupFileName);
    if (fs.existsSync(backupProjectFolder) && fs.statSync(backupProjectFolder).isDirectory()) {
      fs.rmSync(backupProjectFolder, { recursive: true, force: true });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting backup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:startSchedule', async (event, projectName: string, intervalHours: number, maxBackups: number) => {
  try {
    startBackupSchedule(projectName, intervalHours, maxBackups);
    return { success: true };
  } catch (error) {
    console.error('Error starting backup schedule:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:stopSchedule', async (event, projectName: string) => {
  try {
    stopBackupSchedule(projectName);
    return { success: true };
  } catch (error) {
    console.error('Error stopping backup schedule:', error);
    return { success: false, error: error.message };
  }
});

// Initialize backup schedules on app start based on saved settings
// This will be called after app is ready
const initializeBackupSchedules = () => {
  const fs = require('fs');
  const path = require('path');
  
  // Try to load settings from localStorage (stored in renderer)
  // For now, we'll initialize based on default settings
  // The renderer will update schedules when settings change
  const projectsDir = path.join(__dirname, '../../banFlowProjects');
  if (fs.existsSync(projectsDir)) {
    const files = fs.readdirSync(projectsDir);
    files.forEach((file: string) => {
      if (file.endsWith('.json') && !file.startsWith('_') && file !== 'appSettings.json') {
        const projectName = file.replace('.json', '');
        // Default settings: enabled, 24 hours, 10 backups
        // The renderer will update these when settings are loaded
        startBackupSchedule(projectName, 24, 10);
      }
    });
  }
};

app.whenReady().then(() => {
  // Initialize backup schedules after a short delay to ensure everything is loaded
  setTimeout(initializeBackupSchedules, 2000);
});

const setProjectState = (_event: any, values: any) => {
  individualProjectStateValue = {
    ...individualProjectState,
  };
  Object.entries(values).forEach(([key, value]) => {
    individualProjectStateValue = {
      ...individualProjectStateValue,
      [key]: value,
    };
  });

  if (mainWindow) {
    mainWindow.webContents.send(
      'UpdateProjectPageState',
      individualProjectStateValue,
    );
  }
  if (timerWindow) {
    timerWindow.webContents.send(
      'UpdateProjectPageState',
      individualProjectStateValue,
    );
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getProjectState = () => {
  if (timerWindow) {
    timerWindow.webContents.send(
      'UpdateProjectPageState',
      individualProjectStateValue,
    );
  }
};

const initializeProjectState = (_event: any, projectName: any) => {
  individualProjectStateValue.nodes = NodeService.getNodesWithQuery(
    currentLokiService,
    {
      Id: { $ne: null },
    },
  );
  individualProjectStateValue.parents =
    ParentService.getParents(currentLokiService);
  individualProjectStateValue.parentOrder =
    ParentService.getParentOrder(currentLokiService);
  individualProjectStateValue.iterations =
    IterationService.getIterations(currentLokiService);
  individualProjectStateValue.lokiLoaded = true;
  individualProjectStateValue.projectName = projectName;

  // Initialize Git repository service for the project
  if (currentLokiService) {
    gitRepositoryService = new GitRepositoryService(currentLokiService);
    gitService.setProjectContext(projectName, gitRepositoryService);
    
    // Load project repositories
    gitService.loadProjectRepositories().then(() => {
      console.log('Project repositories loaded for:', projectName);
    }).catch(error => {
      console.error('Error loading project repositories:', error);
    });
  }

  if (mainWindow) {
    mainWindow.webContents.send(
      'UpdateProjectPageState',
      individualProjectStateValue,
    );
  }
};

ipcMain.on('getLastOpenedTimes', (event) => {
  event.returnValue = JSON.stringify(lastOpenedTimes);
});

ipcMain.on('setLastOpenedTimes', (event, times) => {
  lastOpenedTimes = JSON.parse(times);
  event.returnValue = true;
});

// Git Service Integration - IPC Handlers for Solo Developers
const gitService = new GitService();
let gitRepositoryService = null;

// Repository Management
ipcMain.handle('git:addRepository', async (event, repoPath) => {
  try {
    console.log('Adding repository:', repoPath);
    const result = await gitService.addRepository(repoPath);
    console.log('Repository added successfully:', result.name);
    return result;
  } catch (error) {
    console.error('Error in git:addRepository:', error);
    throw error;
  }
});

ipcMain.handle('git:switchRepository', async (event, repoPath) => {
  try {
    return await gitService.switchRepository(repoPath);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:getRepositories', async () => {
  try {
    console.log('Getting repositories...');
    const repos = gitService.getRepositories();
    console.log('Found repositories:', repos.length);
    return repos;
  } catch (error) {
    console.error('Error in git:getRepositories:', error);
    throw error;
  }
});

ipcMain.handle('git:getCurrentRepository', async () => {
  try {
    return gitService.getCurrentRepository();
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:getRepositoryStatus', async () => {
  try {
    return await gitService.getRepositoryStatus();
  } catch (error) {
    throw error;
  }
});

// Core Git Operations
ipcMain.handle('git:createBranch', async (event, branchName, startPoint) => {
  try {
    return await gitService.createBranch(branchName, startPoint);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:switchBranch', async (event, branchName) => {
  try {
    return await gitService.switchBranch(branchName);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:deleteBranch', async (event, branchName, force) => {
  try {
    return await gitService.deleteBranch(branchName, force);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:getBranchesWithDates', async () => {
  try {
    return await gitService.getBranchesWithDates();
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:stageFiles', async (event, files) => {
  try {
    return await gitService.stageFiles(files);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:unstageFiles', async (event, files) => {
  try {
    return await gitService.unstageFiles(files);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:commit', async (event, message, description) => {
  try {
    return await gitService.commit(message, description);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:fetch', async (event, remote, prune) => {
  try {
    return await gitService.fetch(remote, prune);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:pull', async (event, remote, branch, strategy) => {
  try {
    return await gitService.pull(remote, branch, strategy);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:push', async (event, remote, branch) => {
  try {
    return await gitService.push(remote, branch);
  } catch (error) {
    throw error;
  }
});

// Stash Operations
ipcMain.handle('git:stashChanges', async (event, message) => {
  try {
    return await gitService.stashChanges(message);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:getStashList', async () => {
  try {
    return await gitService.getStashList();
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:applyStash', async (event, stashIndex) => {
  try {
    return await gitService.applyStash(stashIndex);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:popStash', async (event, stashIndex) => {
  try {
    return await gitService.popStash(stashIndex);
  } catch (error) {
    throw error;
  }
});

// Diff and History
ipcMain.handle('git:getDiff', async (event, file, staged) => {
  console.log('IPC git:getDiff called with:', { file, staged });
  try {
    const result = await gitService.getDiff(file, staged);
    console.log('IPC git:getDiff result:', result);
    return result;
  } catch (error) {
    console.error('IPC git:getDiff error:', error);
    throw error;
  }
});

ipcMain.handle('git:getCommitHistory', async (event, options) => {
  try {
    return await gitService.getCommitHistory(options);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:getCommitFiles', async (event, commitHash) => {
  try {
    return await gitService.getCommitFiles(commitHash);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:getCommitDiff', async (event, commitHash, file) => {
  try {
    return await gitService.getCommitDiff(commitHash, file);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:getFileHistory', async (event, filePath, maxCount) => {
  try {
    return await gitService.getFileHistory(filePath, maxCount);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:getFileAtCommit', async (event, filePath, commitHash) => {
  try {
    return await gitService.getFileAtCommit(filePath, commitHash);
  } catch (error) {
    throw error;
  }
});

// Merge and Rebase
ipcMain.handle('git:merge', async (event, branchName, options) => {
  try {
    return await gitService.merge(branchName, options);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:rebase', async (event, branchName, interactive) => {
  try {
    return await gitService.rebase(branchName, interactive);
  } catch (error) {
    throw error;
  }
});

// Undo System
ipcMain.handle('git:undoLastOperation', async () => {
  try {
    return await gitService.undoLastOperation();
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:getOperationHistory', async () => {
  try {
    return gitService.getOperationHistory();
  } catch (error) {
    throw error;
  }
});

// GitHub Integration
ipcMain.handle('git:authenticateGitHub', async (event, token) => {
  try {
    return await gitService.authenticateGitHub(token);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:cloneRepository', async (event, repoUrl, targetPath) => {
  try {
    return await gitService.cloneRepository(repoUrl, targetPath);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:initRepository', async (event, targetPath) => {
  try {
    return await gitService.initRepository(targetPath);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('git:selectDirectory', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Directory'
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('git:getGitHubRepositories', async () => {
  try {
    return await gitService.getGitHubRepositories();
  } catch (error) {
    throw error;
  }
});

// File System Operations for Repository Selection
ipcMain.handle('git:selectRepository', async () => {
  try {
    const result = dialog.showOpenDialogSync(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Git Repository Folder'
    });
    
    if (result && result.length > 0) {
      return result[0];
    }
    return null;
  } catch (error) {
    throw error;
  }
});

// Project-specific Git Repository Management
ipcMain.handle('git:getProjectRepositoryStats', async () => {
  try {
    return gitService.getProjectRepositoryStats();
  } catch (error) {
    console.error('Error getting project repository stats:', error);
    throw error;
  }
});

ipcMain.handle('git:cleanupProjectRepositories', async () => {
  try {
    return await gitService.cleanupProjectRepositories();
  } catch (error) {
    console.error('Error cleaning up project repositories:', error);
    throw error;
  }
});

ipcMain.handle('git:loadProjectRepositories', async () => {
  try {
    return await gitService.loadProjectRepositories();
  } catch (error) {
    console.error('Error loading project repositories:', error);
    throw error;
  }
});

// File Management Operations
ipcMain.handle('git:discardChanges', async (event, files) => {
  try {
    return await gitService.discardChanges(files);
  } catch (error) {
    console.error('Error discarding changes:', error);
    throw error;
  }
});

ipcMain.handle('git:deleteUntrackedFiles', async (event, files) => {
  try {
    return await gitService.deleteUntrackedFiles(files);
  } catch (error) {
    console.error('Error deleting untracked files:', error);
    throw error;
  }
});

ipcMain.handle('git:cleanUntrackedFiles', async (event, dryRun) => {
  try {
    return await gitService.cleanUntrackedFiles(dryRun);
  } catch (error) {
    console.error('Error cleaning untracked files:', error);
    throw error;
  }
});

// Dashboard project data loading handlers
ipcMain.handle('dashboard:loadProjectData', async (event, projectName) => {
  try {
    const fs = require('fs');
    const Loki = require('lokijs');
    
    const projectPath = projectName.includes('/') || projectName.includes('\\') || projectName.includes(':')
      ? projectName
      : `../banFlowProjects/${projectName}.json`;
    
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project file not found: ${projectPath}`);
    }
    
    return new Promise((resolve, reject) => {
      const db = new Loki(projectPath, {
        autoload: true,
        autosave: false,
        verbose: false,
        autoloadCallback: () => {
          try {
            const nodes = db.getCollection('nodes');
            const parents = db.getCollection('parents');
            const parentOrder = db.getCollection('parentOrder');
            const iterations = db.getCollection('iterations');
            const tags = db.getCollection('tags');
            
            const projectData = {
              projectName: projectName.replace('.json', ''),
              nodes: nodes ? nodes.data : [],
              parents: parents ? parents.data : [],
              parentOrder: parentOrder ? parentOrder.data : [],
              iterations: iterations ? iterations.data : [],
              tags: tags ? tags.data : [],
            };
            
            resolve(projectData);
          } catch (error) {
            reject(error);
          }
        },
      });
    });
  } catch (error) {
    console.error('Error loading project data:', error);
    throw error;
  }
});

ipcMain.handle('dashboard:loadMultipleProjectsData', async (event, projectNames) => {
  try {
    const fs = require('fs');
    const Loki = require('lokijs');
    
    const loadProject = (projectName) => {
      return new Promise((resolve) => {
        try {
          const projectPath = projectName.includes('/') || projectName.includes('\\') || projectName.includes(':')
            ? projectName
            : `../banFlowProjects/${projectName}.json`;
          
          if (!fs.existsSync(projectPath)) {
            resolve(null);
            return;
          }
          
          const db = new Loki(projectPath, {
            autoload: true,
            autosave: false,
            verbose: false,
            autoloadCallback: () => {
              try {
                const nodes = db.getCollection('nodes');
                const parents = db.getCollection('parents');
                const parentOrder = db.getCollection('parentOrder');
                const iterations = db.getCollection('iterations');
                const tags = db.getCollection('tags');
                
                resolve({
                  projectName: projectName.replace('.json', ''),
                  nodes: nodes ? nodes.data : [],
                  parents: parents ? parents.data : [],
                  parentOrder: parentOrder ? parentOrder.data : [],
                  iterations: iterations ? iterations.data : [],
                  tags: tags ? tags.data : [],
                });
              } catch (err) {
                console.error(`Error processing ${projectName}:`, err);
                resolve(null);
              }
            },
          });
        } catch (error) {
          console.error(`Error loading project ${projectName}:`, error);
          resolve(null);
        }
      });
    };
    
    const results = await Promise.all(projectNames.map(loadProject));
    return results.filter(result => result !== null);
  } catch (error) {
    console.error('Error loading multiple projects:', error);
    throw error;
  }
});

ipcMain.on('dashboard:getAllProjectNames', (event) => {
  try {
    const fs = require('fs');
    const projectFolder = '../banFlowProjects';
    
    if (!fs.existsSync(projectFolder)) {
      event.returnValue = [];
      return;
    }
    
    const files = fs.readdirSync(projectFolder);
    const projectNames = files
      .filter(file => file.endsWith('.json') && !file.endsWith('.json~'))
      .map(file => file.replace('.json', ''));
    
    event.returnValue = projectNames;
  } catch (error) {
    console.error('Error getting project names:', error);
    event.returnValue = [];
  }
});

// File Editor Operations
ipcMain.handle('git:readFile', async (event, repoPath, filePath) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Resolve file path relative to repository root
    const fullPath = path.join(repoPath, filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file content
    const content = fs.readFileSync(fullPath, 'utf-8');
    return {
      success: true,
      content: content,
      path: fullPath
    };
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('git:writeFile', async (event, repoPath, filePath, content) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Resolve file path relative to repository root
    const fullPath = path.join(repoPath, filePath);
    
    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file content
    fs.writeFileSync(fullPath, content, 'utf-8');
    
    return {
      success: true,
      path: fullPath,
      message: 'File saved successfully'
    };
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle('git:listFiles', async (event, repoPath) => {
  try {
    const path = require('path');
    const fs = require('fs');
    
    const files: string[] = [];
    const ignoreDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '__pycache__', '.venv', 'venv']);
    
    function walkDir(dir: string, prefix = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.env') continue;
        if (ignoreDirs.has(entry.name)) continue;
        
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walkDir(path.join(dir, entry.name), relativePath);
        } else {
          files.push(relativePath);
        }
      }
    }
    
    walkDir(repoPath);
    return files.sort();
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
});

// Partial Staging Operations (Hunk/Line level)
ipcMain.handle('git:stageHunk', async (event, filePath, hunkIndex) => {
  try {
    return await gitService.stageHunk(filePath, hunkIndex);
  } catch (error) {
    console.error('Error staging hunk:', error);
    throw error;
  }
});

ipcMain.handle('git:discardHunk', async (event, filePath, hunkIndex) => {
  try {
    return await gitService.discardHunk(filePath, hunkIndex);
  } catch (error) {
    console.error('Error discarding hunk:', error);
    throw error;
  }
});

ipcMain.handle('git:stageLines', async (event, filePath, hunkIndex, lineIndices) => {
  try {
    return await gitService.stageLines(filePath, hunkIndex, lineIndices);
  } catch (error) {
    console.error('Error staging lines:', error);
    throw error;
  }
});

ipcMain.handle('git:discardLines', async (event, filePath, hunkIndex, lineIndices) => {
  try {
    return await gitService.discardLines(filePath, hunkIndex, lineIndices);
  } catch (error) {
    console.error('Error discarding lines:', error);
    throw error;
  }
});

ipcMain.handle('git:applyPatch', async (event, patchContent, options = {}) => {
  try {
    return await gitService.applyPatch(patchContent, options);
  } catch (error) {
    console.error('Error applying patch:', error);
    throw error;
  }
});

// ==================== DOCS MANAGEMENT ====================

// Get base paths for project and global docs
const getProjectDocsPath = (projectName: string) => {
  const fs = require('fs');
  const path = require('path');
  const basePath = path.join(__dirname, '../../banFlowProjects', projectName);
  const docsPath = path.join(basePath, 'docs');
  const imagesPath = path.join(basePath, 'images');
  
  // Ensure directories exist
  if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
  if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });
  if (!fs.existsSync(imagesPath)) fs.mkdirSync(imagesPath, { recursive: true });
  
  return { docsPath, imagesPath, basePath };
};

const getGlobalDocsPath = () => {
  const fs = require('fs');
  const path = require('path');
  const basePath = path.join(__dirname, '../../banFlowProjects', 'global');
  const docsPath = path.join(basePath, 'docs');
  const imagesPath = path.join(basePath, 'images');
  
  // Ensure directories exist
  if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
  if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });
  if (!fs.existsSync(imagesPath)) fs.mkdirSync(imagesPath, { recursive: true });
  
  return { docsPath, imagesPath, basePath };
};

// List documents
ipcMain.handle('docs:list', async (event, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { docsPath } = isGlobal ? getGlobalDocsPath() : getProjectDocsPath(projectName || '');
    
    const listFiles = (dir: string, baseDir: string = ''): any[] => {
      const items: any[] = [];
      if (!fs.existsSync(dir)) return items;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = baseDir ? path.join(baseDir, entry.name) : entry.name;
        
        if (entry.isDirectory()) {
          items.push({
            name: entry.name,
            path: relativePath,
            type: 'folder',
            children: listFiles(fullPath, relativePath),
          });
        } else if (entry.name.endsWith('.md')) {
          const stats = fs.statSync(fullPath);
          items.push({
            name: entry.name.replace('.md', ''),
            path: relativePath,
            type: 'file',
            fullPath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          });
        }
      }
      
      return items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    };
    
    return listFiles(docsPath);
  } catch (error) {
    console.error('Error listing docs:', error);
    throw error;
  }
});

// Read document
ipcMain.handle('docs:read', async (event, docPath: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { docsPath } = isGlobal ? getGlobalDocsPath() : getProjectDocsPath(projectName || '');
    const fullPath = path.join(docsPath, docPath.endsWith('.md') ? docPath : `${docPath}.md`);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Document not found: ${docPath}`);
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stats = fs.statSync(fullPath);
    
    return {
      content,
      path: docPath,
      created: stats.birthtime,
      modified: stats.mtime,
      size: stats.size,
    };
  } catch (error) {
    console.error('Error reading doc:', error);
    throw error;
  }
});

// Save document
ipcMain.handle('docs:save', async (event, docPath: string, content: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { docsPath } = isGlobal ? getGlobalDocsPath() : getProjectDocsPath(projectName || '');
    const fullPath = path.join(docsPath, docPath.endsWith('.md') ? docPath : `${docPath}.md`);
    
    // Ensure parent directories exist
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    
    const stats = fs.statSync(fullPath);
    return {
      path: docPath,
      created: stats.birthtime,
      modified: stats.mtime,
      size: stats.size,
    };
  } catch (error) {
    console.error('Error saving doc:', error);
    throw error;
  }
});

// Delete document
ipcMain.handle('docs:delete', async (event, docPath: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { docsPath } = isGlobal ? getGlobalDocsPath() : getProjectDocsPath(projectName || '');
    const fullPath = path.join(docsPath, docPath.endsWith('.md') ? docPath : `${docPath}.md`);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return { success: true };
    }
    
    throw new Error(`Document not found: ${docPath}`);
  } catch (error) {
    console.error('Error deleting doc:', error);
    throw error;
  }
});

// Create folder
ipcMain.handle('docs:createFolder', async (event, folderPath: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { docsPath } = isGlobal ? getGlobalDocsPath() : getProjectDocsPath(projectName || '');
    const fullPath = path.join(docsPath, folderPath);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    return { success: true, path: folderPath };
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
});

// List images
ipcMain.handle('docs:listImages', async (event, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { imagesPath } = isGlobal ? getGlobalDocsPath() : getProjectDocsPath(projectName || '');
    
    if (!fs.existsSync(imagesPath)) return [];
    
    const files = fs.readdirSync(imagesPath);
    const images = files
      .filter((file: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file))
      .map((file: string) => {
        const fullPath = path.join(imagesPath, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          path: file,
          fullPath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      });
    
    return images;
  } catch (error) {
    console.error('Error listing images:', error);
    throw error;
  }
});

// Get image data URL
ipcMain.handle('docs:getImage', async (event, imagePath: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { imagesPath } = isGlobal ? getGlobalDocsPath() : getProjectDocsPath(projectName || '');
    const fullPath = path.join(imagesPath, imagePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }
    
    const imageBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(imagePath).toLowerCase().slice(1);
    const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
    const base64 = imageBuffer.toString('base64');
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error getting image:', error);
    throw error;
  }
});

// Save image (from base64 or buffer)
ipcMain.handle('docs:saveImage', async (event, imageName: string, imageData: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { imagesPath } = isGlobal ? getGlobalDocsPath() : getProjectDocsPath(projectName || '');
    const fullPath = path.join(imagesPath, imageName);
    
    // Handle base64 data URL
    let buffer: Buffer;
    if (imageData.startsWith('data:')) {
      const base64Data = imageData.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(imageData, 'base64');
    }
    
    fs.writeFileSync(fullPath, buffer);
    
    const stats = fs.statSync(fullPath);
    return {
      name: imageName,
      path: imageName,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
});

// Delete image
ipcMain.handle('docs:deleteImage', async (event, imagePath: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { imagesPath } = isGlobal ? getGlobalDocsPath() : getProjectDocsPath(projectName || '');
    const fullPath = path.join(imagesPath, imagePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return { success: true };
    }
    
    throw new Error(`Image not found: ${imagePath}`);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
});

// ==================== DIAGRAMS MANAGEMENT ====================

// Get base paths for project and global diagrams
const getProjectDiagramsPath = (projectName: string) => {
  const fs = require('fs');
  const path = require('path');
  const basePath = path.join(__dirname, '../../banFlowProjects', projectName);
  const diagramsPath = path.join(basePath, 'diagrams');
  
  // Ensure directories exist
  if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
  if (!fs.existsSync(diagramsPath)) fs.mkdirSync(diagramsPath, { recursive: true });
  
  return { diagramsPath, basePath };
};

const getGlobalDiagramsPath = () => {
  const fs = require('fs');
  const path = require('path');
  const basePath = path.join(__dirname, '../../banFlowProjects', 'global');
  const diagramsPath = path.join(basePath, 'diagrams');
  
  // Ensure directories exist
  if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
  if (!fs.existsSync(diagramsPath)) fs.mkdirSync(diagramsPath, { recursive: true });
  
  return { diagramsPath, basePath };
};

// List diagrams
ipcMain.handle('diagrams:list', async (event, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { diagramsPath } = isGlobal ? getGlobalDiagramsPath() : getProjectDiagramsPath(projectName || '');
    
    const listFiles = (dir: string, baseDir: string = ''): any[] => {
      const items: any[] = [];
      if (!fs.existsSync(dir)) return items;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = baseDir ? path.join(baseDir, entry.name) : entry.name;
        
        if (entry.isDirectory()) {
          items.push({
            name: entry.name,
            path: relativePath,
            type: 'folder',
            children: listFiles(fullPath, relativePath),
          });
        } else if (entry.name.endsWith('.json')) {
          const stats = fs.statSync(fullPath);
          items.push({
            name: entry.name.replace('.json', ''),
            path: relativePath,
            type: 'file',
            size: stats.size,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
          });
        }
      }
      
      return items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    };
    
    return listFiles(diagramsPath);
  } catch (error) {
    console.error('Error listing diagrams:', error);
    throw error;
  }
});

// Read diagram
ipcMain.handle('diagrams:read', async (event, diagramPath: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { diagramsPath } = isGlobal ? getGlobalDiagramsPath() : getProjectDiagramsPath(projectName || '');
    const fullPath = path.join(diagramsPath, diagramPath.endsWith('.json') ? diagramPath : `${diagramPath}.json`);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Diagram not found: ${diagramPath}`);
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stats = fs.statSync(fullPath);
    
    return {
      content: JSON.parse(content),
      path: diagramPath,
      name: path.basename(diagramPath, '.json'),
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
    };
  } catch (error) {
    console.error('Error reading diagram:', error);
    throw error;
  }
});

// Save diagram
ipcMain.handle('diagrams:save', async (event, diagramPath: string, content: any, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { diagramsPath } = isGlobal ? getGlobalDiagramsPath() : getProjectDiagramsPath(projectName || '');
    const fullPath = path.join(diagramsPath, diagramPath.endsWith('.json') ? diagramPath : `${diagramPath}.json`);
    
    // Ensure parent directories exist
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, JSON.stringify(content, null, 2), 'utf-8');
    
    return { success: true, path: diagramPath };
  } catch (error) {
    console.error('Error saving diagram:', error);
    throw error;
  }
});

// Delete diagram
ipcMain.handle('diagrams:delete', async (event, diagramPath: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { diagramsPath } = isGlobal ? getGlobalDiagramsPath() : getProjectDiagramsPath(projectName || '');
    const fullPath = path.join(diagramsPath, diagramPath.endsWith('.json') ? diagramPath : `${diagramPath}.json`);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return { success: true };
    }
    
    throw new Error(`Diagram not found: ${diagramPath}`);
  } catch (error) {
    console.error('Error deleting diagram:', error);
    throw error;
  }
});

// Create folder
ipcMain.handle('diagrams:createFolder', async (event, folderPath: string, projectName: string | null, isGlobal: boolean = false) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { diagramsPath } = isGlobal ? getGlobalDiagramsPath() : getProjectDiagramsPath(projectName || '');
    const fullPath = path.join(diagramsPath, folderPath);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    return { success: true, path: folderPath };
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
});
