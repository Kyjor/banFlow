const simpleGit = require('simple-git');
const { Octokit } = require('@octokit/rest');
const path = require('path');
const fs = require('fs');

export default class GitService {
  constructor() {
    this.git = null;
    this.currentRepo = null;
    this.repositories = new Map();
    this.operationHistory = [];
    this.octokit = null;
    this.isAuthenticated = false;
  }

  // Repository Management for Solo Developers
  async addRepository(repoPath) {
    try {
      if (!fs.existsSync(repoPath)) {
        throw new Error('Repository path does not exist');
      }

      const git = simpleGit(repoPath);
      const isRepo = await git.checkIsRepo();
      
      if (!isRepo) {
        throw new Error('Selected directory is not a Git repository');
      }

      const status = await git.status();
      const branches = await git.branch();
      const remotes = await git.getRemotes(true);
      
      const repoInfo = {
        path: repoPath,
        name: path.basename(repoPath),
        currentBranch: branches.current,
        branches: branches.all,
        remotes: remotes,
        status: status,
        lastAccessed: new Date().toISOString()
      };

      this.repositories.set(repoPath, repoInfo);
      return repoInfo;
    } catch (error) {
      console.error('Error adding repository:', error);
      throw error;
    }
  }

  async switchRepository(repoPath) {
    try {
      if (!this.repositories.has(repoPath)) {
        throw new Error('Repository not found in managed repositories');
      }

      this.currentRepo = repoPath;
      this.git = simpleGit(repoPath);
      
      // Update last accessed time
      const repoInfo = this.repositories.get(repoPath);
      repoInfo.lastAccessed = new Date().toISOString();
      this.repositories.set(repoPath, repoInfo);

      return await this.getRepositoryStatus();
    } catch (error) {
      console.error('Error switching repository:', error);
      throw error;
    }
  }

  async getRepositoryStatus() {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const status = await this.git.status();
      const branches = await this.git.branch();
      
      return {
        currentBranch: branches.current,
        staged: status.staged,
        modified: status.modified,
        deleted: status.deleted,
        created: status.created,
        conflicted: status.conflicted,
        ahead: status.ahead,
        behind: status.behind,
        branches: branches.all
      };
    } catch (error) {
      console.error('Error getting repository status:', error);
      throw error;
    }
  }

  // Core Git Operations for Solo Development
  async createBranch(branchName, startPoint = null) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'CREATE_BRANCH',
        timestamp: new Date().toISOString(),
        data: { branchName, startPoint },
        repoPath: this.currentRepo
      };

      if (startPoint) {
        await this.git.checkoutBranch(branchName, startPoint);
      } else {
        await this.git.checkoutLocalBranch(branchName);
      }

      this.operationHistory.push(operation);
      return await this.getRepositoryStatus();
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  async switchBranch(branchName) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'SWITCH_BRANCH',
        timestamp: new Date().toISOString(),
        data: { from: (await this.git.branch()).current, to: branchName },
        repoPath: this.currentRepo
      };

      await this.git.checkout(branchName);
      this.operationHistory.push(operation);
      return await this.getRepositoryStatus();
    } catch (error) {
      console.error('Error switching branch:', error);
      throw error;
    }
  }

  async deleteBranch(branchName, force = false) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'DELETE_BRANCH',
        timestamp: new Date().toISOString(),
        data: { branchName, force },
        repoPath: this.currentRepo
      };

      if (force) {
        await this.git.deleteLocalBranch(branchName, true);
      } else {
        await this.git.deleteLocalBranch(branchName);
      }

      this.operationHistory.push(operation);
      return await this.getRepositoryStatus();
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw error;
    }
  }

  async stageFiles(files) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'STAGE_FILES',
        timestamp: new Date().toISOString(),
        data: { files },
        repoPath: this.currentRepo
      };

      await this.git.add(files);
      this.operationHistory.push(operation);
      return await this.getRepositoryStatus();
    } catch (error) {
      console.error('Error staging files:', error);
      throw error;
    }
  }

  async unstageFiles(files) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'UNSTAGE_FILES',
        timestamp: new Date().toISOString(),
        data: { files },
        repoPath: this.currentRepo
      };

      await this.git.reset(['HEAD', ...files]);
      this.operationHistory.push(operation);
      return await this.getRepositoryStatus();
    } catch (error) {
      console.error('Error unstaging files:', error);
      throw error;
    }
  }

  async commit(message, description = '') {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const fullMessage = description ? `${message}\n\n${description}` : message;
      const operation = {
        type: 'COMMIT',
        timestamp: new Date().toISOString(),
        data: { message, description },
        repoPath: this.currentRepo
      };

      const result = await this.git.commit(fullMessage);
      operation.data.commitHash = result.commit;
      this.operationHistory.push(operation);
      
      return {
        ...result,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error committing:', error);
      throw error;
    }
  }

  async pull(remote = 'origin', branch = null) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const currentBranch = (await this.git.branch()).current;
      const pullBranch = branch || currentBranch;
      
      const operation = {
        type: 'PULL',
        timestamp: new Date().toISOString(),
        data: { remote, branch: pullBranch },
        repoPath: this.currentRepo
      };

      const result = await this.git.pull(remote, pullBranch);
      this.operationHistory.push(operation);
      
      return {
        ...result,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error pulling:', error);
      throw error;
    }
  }

  async push(remote = 'origin', branch = null) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const currentBranch = (await this.git.branch()).current;
      const pushBranch = branch || currentBranch;
      
      const operation = {
        type: 'PUSH',
        timestamp: new Date().toISOString(),
        data: { remote, branch: pushBranch },
        repoPath: this.currentRepo
      };

      const result = await this.git.push(remote, pushBranch);
      this.operationHistory.push(operation);
      
      return {
        ...result,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error pushing:', error);
      throw error;
    }
  }

  // Stash Operations for Solo Development
  async stashChanges(message = null) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'STASH',
        timestamp: new Date().toISOString(),
        data: { message },
        repoPath: this.currentRepo
      };

      const result = message 
        ? await this.git.stash(['save', message])
        : await this.git.stash();
      
      this.operationHistory.push(operation);
      return {
        ...result,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error stashing changes:', error);
      throw error;
    }
  }

  async getStashList() {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const stashList = await this.git.stashList();
      return stashList.all.map(stash => ({
        index: stash.index,
        message: stash.message,
        date: stash.date,
        author_name: stash.author_name,
        author_email: stash.author_email
      }));
    } catch (error) {
      console.error('Error getting stash list:', error);
      throw error;
    }
  }

  async applyStash(stashIndex = 0) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'APPLY_STASH',
        timestamp: new Date().toISOString(),
        data: { stashIndex },
        repoPath: this.currentRepo
      };

      const result = await this.git.stash(['apply', `stash@{${stashIndex}}`]);
      this.operationHistory.push(operation);
      
      return {
        ...result,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error applying stash:', error);
      throw error;
    }
  }

  async popStash(stashIndex = 0) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'POP_STASH',
        timestamp: new Date().toISOString(),
        data: { stashIndex },
        repoPath: this.currentRepo
      };

      const result = await this.git.stash(['pop', `stash@{${stashIndex}}`]);
      this.operationHistory.push(operation);
      
      return {
        ...result,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error popping stash:', error);
      throw error;
    }
  }

  // Diff and History Operations
  async getDiff(file = null, staged = false) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      let diff;
      if (staged) {
        diff = file ? await this.git.diff(['--cached', file]) : await this.git.diff(['--cached']);
      } else {
        diff = file ? await this.git.diff([file]) : await this.git.diff();
      }
      
      return this.parseDiff(diff);
    } catch (error) {
      console.error('Error getting diff:', error);
      throw error;
    }
  }

  async getCommitHistory(options = {}) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const { maxCount = 50, from = null, to = null } = options;
      
      const logOptions = {
        maxCount,
        format: {
          hash: '%H',
          date: '%ai',
          message: '%s',
          body: '%b',
          author_name: '%an',
          author_email: '%ae'
        }
      };

      if (from && to) {
        logOptions.from = from;
        logOptions.to = to;
      }

      const log = await this.git.log(logOptions);
      return log.all;
    } catch (error) {
      console.error('Error getting commit history:', error);
      throw error;
    }
  }

  // Merge and Rebase Operations
  async merge(branchName, options = {}) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'MERGE',
        timestamp: new Date().toISOString(),
        data: { branchName, options },
        repoPath: this.currentRepo
      };

      const result = await this.git.merge([branchName, ...Object.keys(options)]);
      this.operationHistory.push(operation);
      
      return {
        ...result,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error merging:', error);
      throw error;
    }
  }

  async rebase(branchName, interactive = false) {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const operation = {
        type: 'REBASE',
        timestamp: new Date().toISOString(),
        data: { branchName, interactive },
        repoPath: this.currentRepo
      };

      const args = interactive ? ['--interactive', branchName] : [branchName];
      const result = await this.git.rebase(args);
      this.operationHistory.push(operation);
      
      return {
        ...result,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error rebasing:', error);
      throw error;
    }
  }

  // Quick Undo System for Solo Developers
  async undoLastOperation() {
    if (this.operationHistory.length === 0) {
      throw new Error('No operations to undo');
    }

    const lastOperation = this.operationHistory[this.operationHistory.length - 1];
    
    try {
      switch (lastOperation.type) {
        case 'COMMIT':
          await this.git.reset(['--soft', 'HEAD~1']);
          break;
        case 'STAGE_FILES':
          await this.git.reset(['HEAD', ...lastOperation.data.files]);
          break;
        case 'CREATE_BRANCH':
          await this.git.deleteLocalBranch(lastOperation.data.branchName, true);
          break;
        case 'SWITCH_BRANCH':
          await this.git.checkout(lastOperation.data.from);
          break;
        default:
          throw new Error(`Cannot undo operation of type: ${lastOperation.type}`);
      }

      this.operationHistory.pop();
      return await this.getRepositoryStatus();
    } catch (error) {
      console.error('Error undoing operation:', error);
      throw error;
    }
  }

  // GitHub Integration for Solo Developers
  async authenticateGitHub(token) {
    try {
      this.octokit = new Octokit({ auth: token });
      
      // Test authentication
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      this.isAuthenticated = true;
      
      return {
        authenticated: true,
        user: {
          login: user.login,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url
        }
      };
    } catch (error) {
      console.error('GitHub authentication failed:', error);
      this.isAuthenticated = false;
      throw error;
    }
  }

  async cloneRepository(repoUrl, targetPath) {
    try {
      const operation = {
        type: 'CLONE',
        timestamp: new Date().toISOString(),
        data: { repoUrl, targetPath },
        repoPath: targetPath
      };

      await simpleGit().clone(repoUrl, targetPath);
      this.operationHistory.push(operation);
      
      return await this.addRepository(targetPath);
    } catch (error) {
      console.error('Error cloning repository:', error);
      throw error;
    }
  }

  async getGitHubRepositories() {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data: repos } = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
      });

      return repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        clone_url: repo.clone_url,
        ssh_url: repo.ssh_url,
        description: repo.description,
        private: repo.private,
        updated_at: repo.updated_at
      }));
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error);
      throw error;
    }
  }

  // Utility Methods
  parseDiff(diffString) {
    const lines = diffString.split('\n');
    const files = [];
    let currentFile = null;
    let currentHunk = null;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentFile) files.push(currentFile);
        
        currentFile = {
          name: line.split(' b/')[1],
          hunks: [],
          added: 0,
          deleted: 0
        };
      } else if (line.startsWith('@@')) {
        if (currentHunk) currentFile.hunks.push(currentHunk);
        
        currentHunk = {
          header: line,
          lines: []
        };
      } else if (currentHunk) {
        currentHunk.lines.push({
          content: line,
          type: line.startsWith('+') ? 'added' : line.startsWith('-') ? 'deleted' : 'context'
        });
        
        if (line.startsWith('+')) currentFile.added++;
        if (line.startsWith('-')) currentFile.deleted++;
      }
    }

    if (currentHunk) currentFile.hunks.push(currentHunk);
    if (currentFile) files.push(currentFile);

    return files;
  }

  getOperationHistory() {
    return this.operationHistory.slice(-50); // Return last 50 operations
  }

  getRepositories() {
    return Array.from(this.repositories.values());
  }

  getCurrentRepository() {
    return this.currentRepo ? this.repositories.get(this.currentRepo) : null;
  }
} 