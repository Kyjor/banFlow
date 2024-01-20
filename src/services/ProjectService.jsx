import * as fs from 'fs';
import lokiService from './LokiService';
// eslint-disable-next-line import/no-cycle
import { ValidateProjectName } from '../validators/Validator';

/**
 * @class ProjectService
 * @desc creates a new Project with a set of given properties
 */
const ProjectService = {
  /**
   * @function getProjects
   * @desc gets all projects
   * @route Project
   * @returns {array} project - all projects
   * @permission {Read}
   */

  getProjects() {
    const fileList = [];
    const projectFolder = '../banFlowProjects'; // this.isDev ?
    // : './projects';

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

  renameProject(oldName, newName) {
    if (!ValidateProjectName(newName)) {
      // TODO: some notification/popup to indicate why this failed
      return;
    }
    fs.renameSync(
      `../banFlowProjects/${oldName}.json`,
      `../banFlowProjects/${newName}.json`,
    );
  },

  setCurrentProjectName(projectName) {
    if (!ValidateProjectName(projectName)) {
      // TODO: some notification/popup to indicate why this failed
      return;
    }
    lokiService.projectName = projectName;
  },

  createProject(projectName) {
    if (!ValidateProjectName(projectName)) {
      // TODO: some notification/popup to indicate why this failed
      return false;
    }
    try {
      console.log('creating file dev');
      fs.writeFileSync(`../banFlowProjects/${projectName}.json`, '', 'utf-8');
    } catch (e) {
      console.log(e);
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
};

export default ProjectService;
