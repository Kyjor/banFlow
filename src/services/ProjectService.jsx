import { tauriInvoke, tauriSendSync } from '../utils/tauri';
import LokiService from './LokiService';
import { getCurrentLokiService, setCurrentLokiService } from '../stores/shared';

const ProjectService = {
  /**
   * @function validateProjectName
   * @desc validates project name - checks if it's not empty, doesn't contain invalid characters, and doesn't already exist
   * @param {string} projectName - the name to validate
   * @returns {boolean} - true if valid, false otherwise
   */
  async validateProjectName(projectName) {
    if (!projectName) {
      return false;
    }

    const invalidRegex = /\\+|\/+/;
    if (invalidRegex.test(projectName)) {
      return false;
    }

    const items = await this.getProjects();
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
  async getProjects() {
    try {
      return await tauriInvoke('project:getProjects');
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  },

  async openProject(projectName) {
    console.log('[ProjectService] openProject() called for:', projectName);
    try {
      // Notify backend
      console.log('[ProjectService] Notifying backend via InitializeLokiProject');
      await tauriInvoke('InitializeLokiProject', { projectName });
      console.log('[ProjectService] Backend notified');
      
      // Create and initialize LokiService in frontend
      let currentLokiService = getCurrentLokiService();
      console.log('[ProjectService] Current LokiService:', currentLokiService ? currentLokiService.projectName : 'none');
      
      // Check if we already have a service for this project
      if (!currentLokiService || currentLokiService.projectName !== projectName) {
        console.log('[ProjectService] Creating new LokiService instance');
        currentLokiService = new LokiService(projectName);
        setCurrentLokiService(currentLokiService);
        
        // Initialize the database (loads from file via Tauri)
        console.log('[ProjectService] Initializing LokiService...');
        await currentLokiService.init(() => {
          console.log('[ProjectService] LokiService initialized callback fired for project:', projectName);
        });
        console.log('[ProjectService] LokiService initialization complete');
      } else {
        console.log('[ProjectService] Reusing existing LokiService for project:', projectName);
      }
      
      console.log('[ProjectService] openProject() complete, returning:', projectName);
      return projectName;
    } catch (error) {
      console.error('[ProjectService] Error in openProject():', error);
      console.error('[ProjectService] Error stack:', error.stack);
      throw error;
    }
  },

  async renameProject(oldName, newName) {
    if (!(await this.validateProjectName(newName))) {
      // TODO: some notification/popup to indicate why this failed
      return;
    }
    try {
      // Rust: project_rename_project(old_name, new_name, app_handle)
      await tauriInvoke('project:renameProject', {
        oldName,
        newName,
      });
    } catch (error) {
      console.error('Error renaming project:', error);
    }
  },

  async setCurrentProjectName(projectName) {
    if (!(await this.validateProjectName(projectName))) {
      // TODO: some notification/popup to indicate why this failed
      return;
    }
    const currentLokiService = getCurrentLokiService();
    if (currentLokiService) {
      currentLokiService.projectName = projectName;
    }
  },

  async createProject(projectName) {
    if (!(await this.validateProjectName(projectName))) {
      // TODO: some notification/popup to indicate why this failed
      return false;
    }
    try {
      // Rust: project_create_project(project_name, app_handle)
      // Tauri v2 expects camelCase parameter names
      await tauriInvoke('project:createProject', { projectName });
      return true;
    } catch (err) {
      console.error(err);
      alert('Failed to save the file !');
      return false;
    }
  },

  async deleteProject(name) {
    try {
      // Rust: project_delete_project(project_name, app_handle)
      await tauriInvoke('project:deleteProject', { projectName: name });
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
