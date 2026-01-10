import * as fs from 'fs';
import { ipcRenderer } from 'electron';
import lokiService from './LokiService';

const ProjectService = {
  /**
   * @function validateProjectName
   * @desc validates project name - checks if it's not empty, doesn't contain invalid characters, and doesn't already exist
   * @param {string} projectName - the name to validate
   * @returns {boolean} - true if valid, false otherwise
   */
  validateProjectName(projectName) {
    if (!projectName) {
      return false;
    }

    const invalidRegex = /\\+|\/+/;
    if (invalidRegex.test(projectName)) {
      return false;
    }

    const items = this.getProjects();
    let existingName = false;
    items.forEach((item) => {
      if (`${projectName}.json` === item.text || projectName === item.text) {
        existingName = true;
      }
    });

    return !existingName;
  },

  /**
   * @function getProjects
   * @desc gets all projects
   * @route Project
   * @returns {array} project - all projects
   * @permission {Read}
   */
  getProjects() {
    const fileList = [];
    const projectFolder = '../banFlowProjects';

    if (!fs.existsSync(projectFolder)) {
      fs.mkdirSync(projectFolder, {
        recursive: true,
      });
    }

    const files = fs.readdirSync(projectFolder);
    files.forEach((file) => {
      if (file !== '') {
        const newItem = {
          text: file,
          key: Date.now(),
        };
        fileList.push(newItem);
      }
    });

    return fileList;
  },

  openProject(projectName) {
    ipcRenderer.sendSync('InitializeLokiProject', projectName);
  },

  renameProject(oldName, newName) {
    if (!this.validateProjectName(newName)) {
      // TODO: some notification/popup to indicate why this failed
      return;
    }
    fs.renameSync(
      `../banFlowProjects/${oldName}.json`,
      `../banFlowProjects/${newName}.json`,
    );
  },

  setCurrentProjectName(projectName) {
    if (!this.validateProjectName(projectName)) {
      // TODO: some notification/popup to indicate why this failed
      return;
    }
    lokiService.projectName = projectName;
  },

  createProject(projectName) {
    if (!this.validateProjectName(projectName)) {
      // TODO: some notification/popup to indicate why this failed
      return false;
    }
    try {
      fs.writeFileSync(`../banFlowProjects/${projectName}.json`, '', 'utf-8');
    } catch (err) {
      console.error(err);
      alert('Failed to save the file !');
      return false;
    }
    return true;
  },

  deleteProject(name) {
    try {
      fs.unlinkSync(`../banFlowProjects/${name}.json`);
    } catch (err) {
      console.error(err);
    }
    try {
      fs.unlinkSync(`../banFlowProjects/${name}.json~`);
    } catch (err) {
      console.error(err);
    }
  },

  setTrelloBoard(currentLokiService, trelloBoard) {
    currentLokiService.projectSettings
      .chain()
      .find({})
      .update((projectSettings) => {
        projectSettings.trello = trelloBoard;
      });
    currentLokiService.saveDB();
  },

  getProjectSettings(currentLokiService) {
    console.log('getting project settings');
    console.log(currentLokiService.projectSettings);
    return currentLokiService.projectSettings.findOne({});
  },
};

export default ProjectService;
