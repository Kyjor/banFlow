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
    this.gitRepositoryService = null;
    this.currentProject = null;
  }

  setProjectContext(projectName, gitRepositoryService) {
    this.currentProject = projectName;
    this.gitRepositoryService = gitRepositoryService;
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
      
      // Create clean, serializable objects for IPC
      const cleanRemotes = remotes.map(remote => ({
        name: remote.name,
        refs: {
          fetch: remote.refs?.fetch || '',
          push: remote.refs?.push || ''
        }
      }));
      
      const cleanStatus = {
        staged: status.staged || [],
        modified: status.modified || [],
        deleted: status.deleted || [],
        created: status.created || [],
        conflicted: status.conflicted || [],
        ahead: status.ahead || 0,
        behind: status.behind || 0,
        current: status.current || '',
        tracking: status.tracking || ''
      };
      
      const repoInfo = {
        path: repoPath,
        name: path.basename(repoPath),
        currentBranch: branches.current,
        branches: branches.all || [],
        remotes: cleanRemotes,
        status: cleanStatus,
        lastAccessed: new Date().toISOString()
      };

      this.repositories.set(repoPath, repoInfo);
      
      // Cache repository for current project if context is available
      if (this.gitRepositoryService) {
        this.gitRepositoryService.addRepositoryToProject(repoInfo);
      }
      
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

      // Update project cache
      if (this.gitRepositoryService) {
        this.gitRepositoryService.setActiveRepository(repoPath);
      }

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
      
      // Create clean, serializable status object
      const statusInfo = {
        currentBranch: branches.current,
        staged: status.staged || [],
        modified: status.modified || [],
        deleted: status.deleted || [],
        created: status.created || [],
        conflicted: status.conflicted || [],
        ahead: status.ahead || 0,
        behind: status.behind || 0,
        branches: branches.all || []
      };

      // Update project cache with status
      if (this.gitRepositoryService && this.currentRepo) {
        this.gitRepositoryService.updateRepositoryStatus(this.currentRepo, statusInfo);
      }

      return statusInfo;
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
      return (stashList.all || []).map(stash => ({
        index: stash.index,
        message: stash.message || '',
        date: stash.date || '',
        author_name: stash.author_name || '',
        author_email: stash.author_email || ''
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
    console.log('getDiff called with:', { file, staged, hasGit: !!this.git, currentRepo: this.currentRepo });
    
    if (!this.git) throw new Error('No repository selected');
    
    try {
      let diff;
      if (staged) {
        diff = file ? await this.git.diff(['--cached', '--', file]) : await this.git.diff(['--cached']);
      } else {
        diff = file ? await this.git.diff(['--', file]) : await this.git.diff();
      }
      
      console.log('Raw diff output:', diff);
      const parsedDiff = this.parseDiff(diff);
      console.log('Parsed diff:', parsedDiff);
      
      return parsedDiff;
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
      return (log.all || []).map(commit => ({
        hash: commit.hash || '',
        date: commit.date || '',
        message: commit.message || '',
        body: commit.body || '',
        author_name: commit.author_name || '',
        author_email: commit.author_email || ''
      }));
    } catch (error) {
      console.error('Error getting commit history:', error);
      throw error;
    }
  }

  async getBranchesWithDates() {
    if (!this.git) throw new Error('No repository selected');
    
    try {
      const branches = await this.git.branchLocal();
      const branchList = branches.all || [];
      const currentBranch = branches.current;
      
      // Get last commit date for each branch
      const branchesWithDates = await Promise.all(
        branchList.map(async (branchName) => {
          try {
            // Get the last commit on this branch
            const log = await this.git.log({
              maxCount: 1,
              from: branchName,
              format: {
                date: '%ai',
                hash: '%H'
              }
            });
            
            const lastCommit = log.latest || log.all?.[0];
            const lastCommitDate = lastCommit?.date 
              ? new Date(lastCommit.date).toISOString()
              : null;
            
            return {
              name: branchName,
              isCurrent: branchName === currentBranch,
              lastCommitDate: lastCommitDate,
              lastCommitHash: lastCommit?.hash || null
            };
          } catch (error) {
            // If we can't get the date for a branch, still include it
            console.warn(`Could not get date for branch ${branchName}:`, error);
            return {
              name: branchName,
              isCurrent: branchName === currentBranch,
              lastCommitDate: null,
              lastCommitHash: null
            };
          }
        })
      );
      
      // Sort by last commit date (most recent first), then by name
      branchesWithDates.sort((a, b) => {
        if (!a.lastCommitDate && !b.lastCommitDate) {
          return a.name.localeCompare(b.name);
        }
        if (!a.lastCommitDate) return 1;
        if (!b.lastCommitDate) return -1;
        return new Date(b.lastCommitDate) - new Date(a.lastCommitDate);
      });
      
      return branchesWithDates;
    } catch (error) {
      console.error('Error getting branches with dates:', error);
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

  // Discard changes to modified files
  async discardChanges(files) {
    try {
      if (!this.git) throw new Error('No repository selected');
      
      // Reset modified files to HEAD
      await this.git.checkout(['HEAD', '--', ...files]);
      
      return {
        success: true,
        message: `Discarded changes to ${files.length} file(s)`,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error discarding changes:', error);
      throw error;
    }
  }

  // Stage a specific hunk from a file
  async stageHunk(filePath, hunkIndex) {
    try {
      if (!this.git) throw new Error('No repository selected');
      
      // Get the diff for the file
      const diff = await this.git.diff(['--', filePath]);
      const hunks = this.extractHunksFromDiff(diff);
      
      if (hunkIndex >= hunks.length) {
        throw new Error(`Hunk index ${hunkIndex} out of range (${hunks.length} hunks)`);
      }
      
      // Create a patch for just this hunk
      const patch = this.createPatchFromHunk(filePath, hunks[hunkIndex], diff);
      
      // Apply the patch to the index
      await this.applyPatchToIndex(patch);
      
      return {
        success: true,
        message: `Staged hunk ${hunkIndex + 1} of ${hunks.length}`,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error staging hunk:', error);
      throw error;
    }
  }

  // Discard a specific hunk from a file
  async discardHunk(filePath, hunkIndex) {
    try {
      if (!this.git) throw new Error('No repository selected');
      
      // Get the diff for the file
      const diff = await this.git.diff(['--', filePath]);
      const hunks = this.extractHunksFromDiff(diff);
      
      if (hunkIndex >= hunks.length) {
        throw new Error(`Hunk index ${hunkIndex} out of range (${hunks.length} hunks)`);
      }
      
      // Create a reverse patch for just this hunk
      const patch = this.createPatchFromHunk(filePath, hunks[hunkIndex], diff);
      
      // Apply the reverse patch to the working directory
      await this.applyPatchToWorkingDir(patch, true);
      
      return {
        success: true,
        message: `Discarded hunk ${hunkIndex + 1} of ${hunks.length}`,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error discarding hunk:', error);
      throw error;
    }
  }

  // Stage specific lines from a hunk
  async stageLines(filePath, hunkIndex, lineIndices) {
    try {
      if (!this.git) throw new Error('No repository selected');
      
      // Get the diff for the file
      const diff = await this.git.diff(['--', filePath]);
      const hunks = this.extractHunksFromDiff(diff);
      
      if (hunkIndex >= hunks.length) {
        throw new Error(`Hunk index ${hunkIndex} out of range`);
      }
      
      // Create a patch with only the selected lines
      const patch = this.createPatchFromLines(filePath, hunks[hunkIndex], lineIndices, diff);
      
      // Apply the patch to the index
      await this.applyPatchToIndex(patch);
      
      return {
        success: true,
        message: `Staged ${lineIndices.length} line(s)`,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error staging lines:', error);
      throw error;
    }
  }

  // Discard specific lines from a hunk
  async discardLines(filePath, hunkIndex, lineIndices) {
    try {
      if (!this.git) throw new Error('No repository selected');
      
      // Get the diff for the file
      const diff = await this.git.diff(['--', filePath]);
      const hunks = this.extractHunksFromDiff(diff);
      
      if (hunkIndex >= hunks.length) {
        throw new Error(`Hunk index ${hunkIndex} out of range`);
      }
      
      // Create a patch with only the selected lines
      const patch = this.createPatchFromLines(filePath, hunks[hunkIndex], lineIndices, diff);
      
      // Apply the reverse patch to the working directory
      await this.applyPatchToWorkingDir(patch, true);
      
      return {
        success: true,
        message: `Discarded ${lineIndices.length} line(s)`,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error discarding lines:', error);
      throw error;
    }
  }

  // Apply an arbitrary patch
  async applyPatch(patchContent, options = {}) {
    try {
      if (!this.git) throw new Error('No repository selected');
      
      const { cached = false, reverse = false } = options;
      
      if (cached) {
        await this.applyPatchToIndex(patchContent, reverse);
      } else {
        await this.applyPatchToWorkingDir(patchContent, reverse);
      }
      
      return {
        success: true,
        message: 'Patch applied successfully',
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error applying patch:', error);
      throw error;
    }
  }

  // Helper: Extract hunks from raw diff output
  extractHunksFromDiff(diffString) {
    const hunks = [];
    const lines = diffString.split('\n');
    let currentHunk = null;
    let headerInfo = { aFile: '', bFile: '' };
    
    for (const line of lines) {
      // Capture file headers
      if (line.startsWith('--- ')) {
        headerInfo.aFile = line;
      } else if (line.startsWith('+++ ')) {
        headerInfo.bFile = line;
      } else if (line.startsWith('@@')) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        currentHunk = {
          header: line,
          lines: [line],
          aFile: headerInfo.aFile,
          bFile: headerInfo.bFile
        };
      } else if (currentHunk) {
        currentHunk.lines.push(line);
      }
    }
    
    if (currentHunk) {
      hunks.push(currentHunk);
    }
    
    return hunks;
  }

  // Helper: Create a patch from a single hunk
  createPatchFromHunk(filePath, hunk, fullDiff) {
    const lines = fullDiff.split('\n');
    let header = '';
    
    // Find the diff header (everything before first @@)
    for (const line of lines) {
      if (line.startsWith('@@')) break;
      header += line + '\n';
    }
    
    return header + hunk.lines.join('\n') + '\n';
  }

  // Helper: Create a patch from specific lines within a hunk
  createPatchFromLines(filePath, hunk, lineIndices, fullDiff) {
    const lines = fullDiff.split('\n');
    let header = '';
    
    // Find the diff header
    for (const line of lines) {
      if (line.startsWith('@@')) break;
      header += line + '\n';
    }
    
    // Parse hunk header to get line numbers
    const hunkHeaderMatch = hunk.header.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
    if (!hunkHeaderMatch) {
      throw new Error('Invalid hunk header format');
    }
    
    const oldStart = parseInt(hunkHeaderMatch[1]);
    const newStart = parseInt(hunkHeaderMatch[3]);
    
    // Build new hunk with only selected changed lines (keep context)
    const lineIndicesSet = new Set(lineIndices);
    const newLines = [];
    let oldCount = 0;
    let newCount = 0;
    
    hunk.lines.forEach((line, idx) => {
      if (idx === 0) return; // Skip hunk header
      
      const firstChar = line[0];
      
      if (firstChar === ' ' || firstChar === undefined) {
        // Context line - always include
        newLines.push(line);
        oldCount++;
        newCount++;
      } else if (firstChar === '-') {
        if (lineIndicesSet.has(idx)) {
          // Include this deletion
          newLines.push(line);
          oldCount++;
        } else {
          // Convert to context line
          newLines.push(' ' + line.substring(1));
          oldCount++;
          newCount++;
        }
      } else if (firstChar === '+') {
        if (lineIndicesSet.has(idx)) {
          // Include this addition
          newLines.push(line);
          newCount++;
        }
        // If not selected, just skip the line
      }
    });
    
    // Create new hunk header
    const newHeader = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`;
    
    return header + newHeader + '\n' + newLines.join('\n') + '\n';
  }

  // Helper: Apply patch to index (staging area)
  async applyPatchToIndex(patchContent, reverse = false) {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Write patch to temp file
    const tempFile = path.join(os.tmpdir(), `git-patch-${Date.now()}.patch`);
    fs.writeFileSync(tempFile, patchContent);
    
    try {
      const args = ['apply', '--cached'];
      if (reverse) args.push('--reverse');
      args.push(tempFile);
      
      execSync(`git ${args.join(' ')}`, {
        cwd: this.currentRepo,
        encoding: 'utf-8'
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  // Helper: Apply patch to working directory
  async applyPatchToWorkingDir(patchContent, reverse = false) {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Write patch to temp file
    const tempFile = path.join(os.tmpdir(), `git-patch-${Date.now()}.patch`);
    fs.writeFileSync(tempFile, patchContent);
    
    try {
      const args = ['apply'];
      if (reverse) args.push('--reverse');
      args.push(tempFile);
      
      execSync(`git ${args.join(' ')}`, {
        cwd: this.currentRepo,
        encoding: 'utf-8'
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  // Delete untracked files
  async deleteUntrackedFiles(files) {
    try {
      if (!this.git) throw new Error('No repository selected');
      
      const fs = require('fs');
      const path = require('path');
      
      // Delete files from filesystem
      for (const file of files) {
        const fullPath = path.join(this.currentRepo, file);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      
      return {
        success: true,
        message: `Deleted ${files.length} untracked file(s)`,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error deleting untracked files:', error);
      throw error;
    }
  }

  // Clean untracked files (git clean)
  async cleanUntrackedFiles(dryRun = false) {
    try {
      if (!this.git) throw new Error('No repository selected');
      
      const options = ['-f']; // Force
      if (dryRun) {
        options.push('-n'); // Dry run
      }
      
      const result = await this.git.clean(options);
      
      return {
        success: true,
        message: dryRun ? 'Dry run completed' : 'Cleaned untracked files',
        result: result,
        status: await this.getRepositoryStatus()
      };
    } catch (error) {
      console.error('Error cleaning untracked files:', error);
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
          login: user.login || '',
          name: user.name || '',
          email: user.email || '',
          avatar_url: user.avatar_url || ''
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

      return (repos || []).map(repo => ({
        id: repo.id || 0,
        name: repo.name || '',
        full_name: repo.full_name || '',
        clone_url: repo.clone_url || '',
        ssh_url: repo.ssh_url || '',
        description: repo.description || '',
        private: repo.private || false,
        updated_at: repo.updated_at || ''
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
    // If we have project context, load from project cache first
    if (this.gitRepositoryService) {
      const projectRepos = this.gitRepositoryService.getProjectRepositories();
      
      // Merge with in-memory repositories
      projectRepos.forEach(projectRepo => {
        if (!this.repositories.has(projectRepo.path)) {
          this.repositories.set(projectRepo.path, {
            path: projectRepo.path,
            name: projectRepo.name,
            currentBranch: projectRepo.currentBranch,
            branches: projectRepo.branches || [],
            remotes: projectRepo.remotes || [],
            status: projectRepo.status || {},
            lastAccessed: projectRepo.lastAccessed,
            isActive: projectRepo.isActive || false
          });
        }
      });
    }

    return Array.from(this.repositories.values()).map(repo => ({
      path: repo.path,
      name: repo.name,
      currentBranch: repo.currentBranch,
      branches: repo.branches || [],
      remotes: repo.remotes || [],
      status: repo.status || {},
      lastAccessed: repo.lastAccessed,
      isActive: repo.isActive || false
    }));
  }

  getCurrentRepository() {
    if (!this.currentRepo) return null;
    
    const repo = this.repositories.get(this.currentRepo);
    if (!repo) return null;
    
    return {
      path: repo.path,
      name: repo.name,
      currentBranch: repo.currentBranch,
      branches: repo.branches || [],
      remotes: repo.remotes || [],
      status: repo.status || {},
      lastAccessed: repo.lastAccessed,
      isActive: repo.isActive || false
    };
  }

  // New methods for project-specific repository management
  async loadProjectRepositories() {
    if (!this.gitRepositoryService) return [];
    
    try {
      const projectRepos = this.gitRepositoryService.getProjectRepositories();
      
      // Load repositories into memory
      projectRepos.forEach(projectRepo => {
        this.repositories.set(projectRepo.path, {
          path: projectRepo.path,
          name: projectRepo.name,
          currentBranch: projectRepo.currentBranch,
          branches: projectRepo.branches || [],
          remotes: projectRepo.remotes || [],
          status: projectRepo.status || {},
          lastAccessed: projectRepo.lastAccessed,
          isActive: projectRepo.isActive || false
        });
      });

      // Set active repository if available
      const activeRepo = this.gitRepositoryService.getActiveRepository();
      if (activeRepo && this.repositories.has(activeRepo.path)) {
        this.currentRepo = activeRepo.path;
        this.git = simpleGit(activeRepo.path);
      }

      return projectRepos;
    } catch (error) {
      console.error('Error loading project repositories:', error);
      return [];
    }
  }

  getProjectRepositoryStats() {
    if (!this.gitRepositoryService) return null;
    return this.gitRepositoryService.getRepositoryStats();
  }

  async cleanupProjectRepositories() {
    if (!this.gitRepositoryService) return [];
    return this.gitRepositoryService.cleanupNonExistentRepositories();
  }
} 