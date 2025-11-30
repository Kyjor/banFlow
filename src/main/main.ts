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
  event.returnValue = NodeService.getNodesWithQuery(currentLokiService, query);
});

ipcMain.on('api:getNodes', (event) => {
  event.returnValue = NodeService.getNodes(currentLokiService);
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

ipcMain.on('api:addTag', (event, tagTitle) => {
  TagService.addTag(currentLokiService, tagTitle);
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
