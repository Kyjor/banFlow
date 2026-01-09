/**
 * Utility to load project data from JSON files via IPC
 */

import { ipcRenderer } from 'electron';

/**
 * Load a single project's data from its JSON file via IPC
 */
export const loadProjectData = async (projectName) => {
  try {
    const projectData = await ipcRenderer.invoke(
      'dashboard:loadProjectData',
      projectName,
    );
    return projectData;
  } catch (error) {
    console.error(`Error loading project ${projectName}:`, error);
    throw error;
  }
};

/**
 * Load multiple projects' data
 */
export const loadMultipleProjectsData = async (projectNames) => {
  if (
    !projectNames ||
    !Array.isArray(projectNames) ||
    projectNames.length === 0
  ) {
    return [];
  }

  try {
    const results = await ipcRenderer.invoke(
      'dashboard:loadMultipleProjectsData',
      projectNames,
    );
    return results.filter((result) => result !== null);
  } catch (error) {
    console.error('Error loading multiple projects:', error);
    return [];
  }
};

/**
 * Get all available project names via IPC
 */
export const getAllProjectNames = () => {
  try {
    return ipcRenderer.sendSync('dashboard:getAllProjectNames');
  } catch (error) {
    console.error('Error getting project names:', error);
    return [];
  }
};
