// eslint-disable-next-line import/no-cycle
import projectService from '../../services/ProjectService';

/**
 * @class ProjectController
 * @desc Interacts directly with the ProjectService to perform CRUD operations on nodes. This is the interface between the UI and the database.
 */
const ProjectController = {
  /**
   * @function getProjects
   * @desc gets all projects
   * @route Projects
   * @returns {array} project - all projects
   * @permission {Read}
   */
  getProjects() {
    return projectService.getProjects();
  },

  /**
   * @function createProject
   * @desc creates a new Project with a set of given properties
   * @route Projects
   * @param {string} projectName - the title of the project.
   * @returns {object} project - the newly created project
   * @permission {Modification}
   */
  createProject(projectName) {
    return projectService.createProject(projectName);
  },

  /**
   * @function setCurrentProjectName
   * @desc sets the current project name
   * @route Projects
   * @permission {Modification}
   */
  setCurrentProjectName(projectName) {
    return projectService.setCurrentProjectName(projectName);
  },

  /**
   * @function openProject
   * @desc creates a new instance of lokiservice to access the project
   * @route Projects
   * @param {string} projectName - the name of the project to open.
   * @permission {Read}
   */
  openProject(projectName) {
    return projectService.openProject(projectName);
  },

  renameProject(oldName, newName) {
    projectService.renameProject(oldName, newName);
  },

  deleteProject(projectName) {
    projectService.deleteProject(projectName);
  },

  updateProjectProperty(propertyToUpdate, projectId, newValue) {
    return projectService.updateProjectProperty(
      propertyToUpdate,
      projectId,
      newValue,
    );
  },
};

export default ProjectController;
