import * as fs from 'fs';
import lokiService from './LokiService';

/**
 * @class ProjectService
 * @desc creates a new Project with a set of given properties
 */
class ProjectService {
  constructor() {
    this.isDev = null;
    const self = this;
  }

  /**
   * @function getProjects
   * @desc gets all projects
   * @route Project
   * @returns {array} project - all projects
   * @permission {Read}
   */

  getProjects = () => {
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
  };

  renameProject = (oldName, newName) => {
    // if (!this.isDev) {
    //   fs.renameSync(`./projects/${oldName}.json`, `./projects/${newName}.json`);
    // } else
    fs.renameSync(
      `../banFlowProjects/${oldName}.json`,
      `../banFlowProjects/${newName}.json`
    );
  };

  setCurrentProjectName = (projectName) => {
    lokiService.projectName = projectName;
  };

  createProject = (projectName) => {
    try {
      // if (!this.isDev) {
      //   if (!fs.existsSync('./projects')) {
      //     fs.mkdirSync('./projects');
      //   }
      //   fs.writeFileSync(`./projects/${projectName}.json`, '', 'utf-8');
      // } else {
      console.log('creating file dev');
      fs.writeFileSync(`../banFlowProjects/${projectName}.json`, '', 'utf-8');
      // }
    } catch (e) {
      console.log(e);
      alert('Failed to save the file !');
    }
  };

  deleteProject = (name) => {
    try {
      // if (!this.isDev) {
      // fs.unlinkSync(`./projects/${name}.json`);
      // } else
      fs.unlinkSync(`../banFlowProjects/${name}.json`);
    } catch (err) {
      console.error(err);
    }
    try {
      // if (!this.isDev) {
      //   fs.unlinkSync(`./projects/${name}.json~`);
      // } else
      fs.unlinkSync(`../banFlowProjects/${name}.json~`);
    } catch (err) {
      console.error(err);
    }
  };
}

// create one instance of the class to export so everyone can share it
const projectService = new ProjectService();
export default projectService;
