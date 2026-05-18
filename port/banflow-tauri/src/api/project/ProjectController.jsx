import { tauriSendSync } from '../../utils/tauri';
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
  async getProjects() {
    return await projectService.getProjects();
  },

  /**
   * @function createProject
   * @desc creates a new Project with a set of given properties
   * @route Projects
   * @param {string} projectName - the title of the project.
   * @returns {object} project - the newly created project
   * @permission {Modification}
   */
  async createProject(projectName) {
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('Project name is required and must be a string');
    }
    return await projectService.createProject(projectName);
  },

  /**
   * @function setCurrentProjectName
   * @desc sets the current project name
   * @route Projects
   * @param {string} projectName - the name of the project to set as current
   * @returns {*} the result of setting the current project name
   * @permission {Modification}
   */
  async setCurrentProjectName(projectName) {
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('Project name is required and must be a string');
    }
    return await projectService.setCurrentProjectName(projectName);
  },

  /**
   * @function openProject
   * @desc creates a new instance of lokiservice to access the project
   * @route Projects
   * @param {string} projectName - the name of the project to open.
   * @returns {*} the result of opening the project
   * @permission {Read}
   */
  async openProject(projectName) {
    console.log('[ProjectController] openProject() called with:', projectName);
    if (!projectName || typeof projectName !== 'string') {
      console.error('[ProjectController] Invalid project name:', projectName);
      throw new Error('Project name is required and must be a string');
    }
    try {
      const result = await projectService.openProject(projectName);
      console.log('[ProjectController] openProject() completed, result:', result);
      return result;
    } catch (error) {
      console.error('[ProjectController] Error in openProject():', error);
      console.error('[ProjectController] Error stack:', error.stack);
      throw error;
    }
  },

  /**
   * @function renameProject
   * @desc renames an existing project
   * @route Projects
   * @param {string} oldName - the current name of the project
   * @param {string} newName - the new name for the project
   * @returns {boolean} true if rename was successful, false otherwise
   * @permission {Modification}
   */
  async renameProject(oldName, newName) {
    if (!oldName || typeof oldName !== 'string') {
      throw new Error('Old project name is required and must be a string');
    }
    if (!newName || typeof newName !== 'string') {
      throw new Error('New project name is required and must be a string');
    }
    try {
      await projectService.renameProject(oldName, newName);
      return true;
    } catch (error) {
      console.error('Failed to rename project:', error);
      return false;
    }
  },

  /**
   * @function deleteProject
   * @desc deletes a project
   * @route Projects
   * @param {string} projectName - the name of the project to delete
   * @returns {boolean} true if deletion was successful, false otherwise
   * @permission {Modification}
   */
  async deleteProject(projectName) {
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('Project name is required and must be a string');
    }
    try {
      await projectService.deleteProject(projectName);
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  },

  /**
   * @function updateProjectProperty
   * @desc updates a specific property of a project
   * @route Projects
   * @param {string} propertyToUpdate - the property name to update
   * @param {string|number} projectId - the ID of the project to update
   * @param {*} newValue - the new value for the property
   * @returns {*} the result of the property update operation
   * @permission {Modification}
   */
  updateProjectProperty(propertyToUpdate, projectId, newValue) {
    if (!propertyToUpdate || typeof propertyToUpdate !== 'string') {
      throw new Error('Property name is required and must be a string');
    }
    if (projectId === undefined || projectId === null) {
      throw new Error('Project ID is required');
    }
    return projectService.updateProjectProperty(
      propertyToUpdate,
      projectId,
      newValue,
    );
  },

  /**
   * @function setTrelloBoard
   * @desc sets the Trello board configuration
   * @route Projects
   * @param {*} trelloBoard - the Trello board configuration
   * @returns {*} the result of setting the Trello board
   * @permission {Modification}
   */
  async setTrelloBoard(trelloBoard) {
    return await tauriSendSync('api:setTrelloBoard', trelloBoard);
  },

  /**
   * @function getProjectSettings
   * @desc gets the current project settings
   * @route Projects
   * @returns {*} the current project settings
   * @permission {Read}
   */
  async getProjectSettings() {
    return await tauriSendSync('api:getProjectSettings');
  },
};

export default ProjectController;
