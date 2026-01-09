export default class GitRepositoryService {
  constructor(lokiService) {
    this.lokiService = lokiService;
    this.gitRepositories = lokiService.gitRepositories;
  }

  /**
   * Add a Git repository to the current project
   * @param {Object} repoInfo - Repository information
   * @returns {Object} - Added repository with project association
   */
  addRepositoryToProject(repoInfo) {
    try {
      const existingRepo = this.gitRepositories.findOne({
        path: repoInfo.path,
        projectName: this.lokiService.projectName,
      });

      if (existingRepo) {
        // Update existing repository
        const updatedRepo = {
          ...existingRepo,
          ...repoInfo,
          lastAccessed: new Date().toISOString(),
          projectName: this.lokiService.projectName,
        };

        this.gitRepositories.update(updatedRepo);
        return updatedRepo;
      }
      // Add new repository
      const newRepo = {
        ...repoInfo,
        projectName: this.lokiService.projectName,
        addedAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        isActive: true,
      };

      const inserted = this.gitRepositories.insert(newRepo);
      return inserted;
    } catch (error) {
      console.error('Error adding repository to project:', error);
      throw error;
    }
  }

  /**
   * Get all repositories associated with the current project
   * @returns {Array} - Array of repository objects
   */
  getProjectRepositories() {
    try {
      const repos = this.gitRepositories.find({
        projectName: this.lokiService.projectName,
      });

      return repos || [];
    } catch (error) {
      console.error('Error getting project repositories:', error);
      return [];
    }
  }

  /**
   * Get a specific repository by path for the current project
   * @param {string} repoPath - Repository path
   * @returns {Object|null} - Repository object or null
   */
  getRepositoryByPath(repoPath) {
    try {
      return this.gitRepositories.findOne({
        path: repoPath,
        projectName: this.lokiService.projectName,
      });
    } catch (error) {
      console.error('Error getting repository by path:', error);
      return null;
    }
  }

  /**
   * Update repository information for the current project
   * @param {string} repoPath - Repository path
   * @param {Object} updates - Fields to update
   * @returns {Object|null} - Updated repository or null
   */
  updateRepository(repoPath, updates) {
    try {
      const repo = this.getRepositoryByPath(repoPath);
      if (!repo) {
        return null;
      }

      const updatedRepo = {
        ...repo,
        ...updates,
        lastAccessed: new Date().toISOString(),
      };

      this.gitRepositories.update(updatedRepo);
      return updatedRepo;
    } catch (error) {
      console.error('Error updating repository:', error);
      return null;
    }
  }

  /**
   * Remove a repository from the current project
   * @param {string} repoPath - Repository path
   * @returns {boolean} - Success status
   */
  removeRepositoryFromProject(repoPath) {
    try {
      const repo = this.getRepositoryByPath(repoPath);
      if (!repo) {
        return false;
      }

      this.gitRepositories.remove(repo);
      return true;
    } catch (error) {
      console.error('Error removing repository from project:', error);
      return false;
    }
  }

  /**
   * Set a repository as active for the current project
   * @param {string} repoPath - Repository path
   * @returns {boolean} - Success status
   */
  setActiveRepository(repoPath) {
    try {
      // Set all repositories as inactive first
      const projectRepos = this.getProjectRepositories();
      projectRepos.forEach((repo) => {
        if (repo.isActive) {
          this.gitRepositories.update({
            ...repo,
            isActive: false,
          });
        }
      });

      // Set the specified repository as active
      const repo = this.getRepositoryByPath(repoPath);
      if (repo) {
        this.gitRepositories.update({
          ...repo,
          isActive: true,
          lastAccessed: new Date().toISOString(),
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error setting active repository:', error);
      return false;
    }
  }

  /**
   * Get the currently active repository for the project
   * @returns {Object|null} - Active repository or null
   */
  getActiveRepository() {
    try {
      return this.gitRepositories.findOne({
        projectName: this.lokiService.projectName,
        isActive: true,
      });
    } catch (error) {
      console.error('Error getting active repository:', error);
      return null;
    }
  }

  /**
   * Update repository status information
   * @param {string} repoPath - Repository path
   * @param {Object} status - Git status information
   * @returns {Object|null} - Updated repository or null
   */
  updateRepositoryStatus(repoPath, status) {
    try {
      return this.updateRepository(repoPath, {
        status,
        lastStatusUpdate: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating repository status:', error);
      return null;
    }
  }

  /**
   * Get repositories with recent activity
   * @param {number} days - Number of days to look back
   * @returns {Array} - Array of recently accessed repositories
   */
  getRecentlyAccessedRepositories(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return this.gitRepositories
        .find({
          projectName: this.lokiService.projectName,
          lastAccessed: { $gte: cutoffDate.toISOString() },
        })
        .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
    } catch (error) {
      console.error('Error getting recently accessed repositories:', error);
      return [];
    }
  }

  /**
   * Get repository statistics for the project
   * @returns {Object} - Repository statistics
   */
  getRepositoryStats() {
    try {
      const repos = this.getProjectRepositories();

      return {
        total: repos.length,
        active: repos.filter((repo) => repo.isActive).length,
        recentlyAccessed: this.getRecentlyAccessedRepositories(7).length,
        lastAdded:
          repos.length > 0
            ? repos.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))[0]
            : null,
      };
    } catch (error) {
      console.error('Error getting repository stats:', error);
      return {
        total: 0,
        active: 0,
        recentlyAccessed: 0,
        lastAdded: null,
      };
    }
  }

  /**
   * Clean up repositories that no longer exist on disk
   * @returns {Array} - Array of removed repository paths
   */
  cleanupNonExistentRepositories() {
    try {
      const fs = require('fs');
      const repos = this.getProjectRepositories();
      const removedPaths = [];

      repos.forEach((repo) => {
        if (!fs.existsSync(repo.path)) {
          this.removeRepositoryFromProject(repo.path);
          removedPaths.push(repo.path);
        }
      });

      return removedPaths;
    } catch (error) {
      console.error('Error cleaning up repositories:', error);
      return [];
    }
  }
}
