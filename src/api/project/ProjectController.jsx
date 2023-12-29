import projectService from '../../services/ProjectService';

/**
 * @class ProjectController
 * @desc creates a new Project with a set of given properties
 */
class ProjectController {
  /**
   * @function getProjects
   * @desc gets all projects
   * @route Projects
   * @returns {array} project - all projects
   * @permission {Read}
   */
  getProjects = (isDev) => {
    return projectService.getProjects(isDev);
  };

  /**
   * @function createProject
   * @desc creates a new Project with a set of given properties
   * @route Projects
   * @param {string} projectType - the type of project to create.
   * @param {string} projectTitle - the title of the project.
   * @param {string} [parentId=``] - the Id of the parent of the project. Can be null or empty.
   * @returns {object} project - the newly created project
   * @permission {Modification}
   */
  createProject = (projectName) => {
    return projectService.createProject(projectName);
  };

  /**
   * @function setCurrentProjectName
   * @desc creates a new Project with a set of given properties
   * @route Projects
   * @param {string} projectType - the type of project to create.
   * @permission {Modification}
   */
  setCurrentProjectName = (projectName) => {
    return projectService.setCurrentProjectName(projectName);
  };

  renameProject = (oldName, newName) => {
    projectService.renameProject(oldName, newName);
  };

  deleteProject = (projectName) => {
    projectService.deleteProject(projectName);
  };

  updateProjectProperty = (propertyToUpdate, projectId, newValue) => {
    return projectService.updateProjectProperty(
      propertyToUpdate,
      projectId,
      newValue
    );
  };
}

// create one instance of the class to export so everyone can share it
const projectController = new ProjectController();
export default projectController;
