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
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm',
      message: 'Are you sure you want to quit?',
    });

    if (choice === 1) {
      e.preventDefault();
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
    ipcMain.handle('api:getNodes', getNodes);
    ipcMain.handle('api:getNodesWithQuery', getNodesWithQuery);
    ipcMain.handle('api:getParents', getParents);
    ipcMain.handle('api:getParentOrder', getParentOrder);
    ipcMain.handle('api:getTimerPreferences', getTimerPreferences);
    ipcMain.handle('api:getNodeTypes', getNodeTypes);
    ipcMain.handle('api:getNodeStates', getNodeStates);
    ipcMain.handle('api:getTags', getTags);
    ipcMain.handle('api:getProjectState', getProjectState);
    ipcMain.handle('api:initializeProjectState', initializeProjectState);
    ipcMain.handle('api:setProjectState', setProjectState);
  })
  .catch(console.log);

ipcMain.on(
  'MSG_FROM_RENDERER',
  (
    event,
    node,
    projectName,
    stateInit,
    lokiService,
    timerPrefs,
    controllers,
  ) => {
    mainWindow.webContents.send(
      'MSG_FROM_RENDERER',
      '(event,node, projectName, stateInit, lokiService, timerPrefs, controllers)',
    );
    createTimerWindow(node, projectName, stateInit, timerPrefs);
  },
);

ipcMain.on('SaveNodeTime', (event, nodeId, seconds) => {
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
  timerWindow = new BrowserWindow({
    width: 350,
    height: 250,
    titleBarStyle: 'customButtonsOnHover',
    frame: true,
    alwaysOnTop: true,
    show: false,
    resizable: true,
    transparent: true,

    // You need to activate `nativeWindowOpen`
    webPreferences: {
      nodeIntegration: true,
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
  console.log('InitializeLokiProject', projectName);
  // set currentLokiService to the lokiService with the matching projectName
  currentLokiService = lokiServices.find(
    (lokiService: any) => lokiService.projectName === projectName,
  );
  if (!currentLokiService) {
    currentLokiService = new LokiService(projectName);
    currentLokiService.init(lokiLoadedCallback);
  }
  // add currentLokiService to lokiServices
  lokiServices.push(currentLokiService);
  // console.log(currentLokiService.nodes.data);
  // if (mainWindow) {
  //   console.log(currentLokiService);
  //   mainWindow.webContents.send(
  //     'UpdateCurrentProject',
  //     currentLokiService.nodes,
  //   );
  // }
  event.returnValue = 'test';
});

const lokiLoadedCallback = () => {
  console.log('loki loaded');
  if (mainWindow) {
    mainWindow.webContents.send('UpdateCurrentProject', true);
  }
};

ipcMain.on('InitializedLokiService', (event, lokiService) => {
  currentLokiService = lokiService;
  // add currentLokiService to lokiServices
  lokiServices.push(currentLokiService);
});

const getNodes = () => {
  console.log('current loki');
  const nodes = currentLokiService.nodes.find({ Id: { $ne: null } });

  let response = {};

  nodes.forEach((node: { id: number }) => {
    response = {
      ...response,
      [node.id]: {
        ...node,
      },
    };
  });

  return response;
};

const getNodesWithQuery = (query: any) => {
  console.log('current loki');
  return currentLokiService.nodes.find(query);
};

const getParents = () => {
  const parents = currentLokiService.parents.find({ Id: { $ne: null } });

  let response = {};

  parents.forEach((parent: { id: any }) => {
    response = {
      ...response,
      [parent.id]: {
        ...parent,
      },
    };
  });

  return response;
};

const getParentOrder = () => {
  const parentOrder = currentLokiService.parentOrder.find({
    Id: { $ne: null },
  });

  const response: any[] = [];

  parentOrder.forEach((obj: { parentId: any }) => {
    response.push(obj.parentId);
  });

  return response;
};

const getNodeTypes = () => {
  console.log('current loki');
  return currentLokiService.nodeTypes.find({ Id: { $ne: null } });
};

const getNodeStates = () => {
  console.log('current loki');
  return currentLokiService.nodeStates.find({ Id: { $ne: null } });
};

const getTags = () => {
  console.log('current loki');
  return currentLokiService.tags.find({ Id: { $ne: null } });
};

const getTimerPreferences = () => {
  console.log('current loki');
  return currentLokiService.timerPreferences.data[0];
};

const initializeProjectState = (event, projectName: any) => {
  individualProjectStateValue.nodes = getNodes();
  individualProjectStateValue.parents = getParents();
  individualProjectStateValue.parentOrder = getParentOrder();
  individualProjectStateValue.lokiLoaded = true;
  individualProjectStateValue.projectName = projectName;

  console.log(individualProjectStateValue);

  if (mainWindow) {
    mainWindow.webContents.send(
      'UpdateProjectPageState',
      individualProjectStateValue,
    );
  }
};

const setProjectState = (event, values: any) => {
  individualProjectStateValue = { ...individualProjectStateValue, ...values };

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

const getProjectState = (event) => {
  if (timerWindow) {
    timerWindow.webContents.send(
      'UpdateProjectPageState',
      individualProjectStateValue,
    );
  }
};
