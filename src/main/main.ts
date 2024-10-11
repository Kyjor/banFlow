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

remoteMain.initialize();
let mainWindow: BrowserWindow | null = null;
// eslint-disable-next-line no-undef
let timerWindow: BrowserWindow | Electron.PopupOptions | null | undefined;
let individualProjectStateValue: any = individualProjectState;

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
  (event, updatedOriginParent, updatedDestinationParent, nodeId) => {
    ParentService.updateNodesInParents(
      currentLokiService,
      updatedOriginParent,
      updatedDestinationParent,
      nodeId,
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

  if (mainWindow) {
    mainWindow.webContents.send(
      'UpdateProjectPageState',
      individualProjectStateValue,
    );
  }
};
