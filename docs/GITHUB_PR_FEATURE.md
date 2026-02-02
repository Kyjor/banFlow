# GitHub Pull Request Feature - Design Document

## Overview
Complete GitHub Pull Request management system integrated into banFlow's Git client, allowing users to create, review, and merge pull requests directly from the application.

## Feature Scope

### Core Functionality
1. **Pull Request Creation**
   - Create PR from current branch to target branch
   - Set title, description, reviewers, labels
   - Link to existing GitHub repository
   - Auto-detect base branch (main/master/develop)

2. **Pull Request Listing**
   - View all PRs for current repository
   - Filter by status (open, closed, merged, draft)
   - Sort by date, author, status
   - Show PR metadata (number, title, author, status, labels)

3. **Pull Request Review**
   - View PR details (description, files changed, commits)
   - Review file diffs inline
   - View comments and reviews
   - See review status (approved, changes requested, etc.)

4. **Pull Request Management**
   - Merge PR (merge, squash, rebase strategies)
   - Close PR
   - Update PR (title, description)
   - Add comments

5. **Integration Points**
   - Detect if current repo is a GitHub repo
   - Show PR status in branch list
   - Quick actions from branch context menu
   - PR badge indicators

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ PRList       │  │ PRCreate     │  │ PRReview     │  │
│  │ Component    │  │ Component    │  │ Component    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
│         └─────────────────┼──────────────────┘           │
│                           │                              │
│                    ┌──────▼───────┐                      │
│                    │  GitContext  │                      │
│                    │  (PR State)  │                      │
│                    └──────┬───────┘                      │
└───────────────────────────┼─────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────┐
│                    IPC Layer                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  git:createPullRequest                           │   │
│  │  git:getPullRequests                             │   │
│  │  git:getPullRequest                              │   │
│  │  git:mergePullRequest                             │   │
│  │  git:closePullRequest                             │   │
│  │  git:updatePullRequest                            │   │
│  │  git:addPullRequestComment                        │   │
│  │  git:getPullRequestFiles                          │   │
│  │  git:getPullRequestCommits                        │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────┐
│              Main Process (Node.js)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  GitHubService                                   │   │
│  │  - createPR()                                    │   │
│  │  - getPRs()                                      │   │
│  │  - getPR()                                       │   │
│  │  - mergePR()                                     │   │
│  │  - closePR()                                     │   │
│  │  - updatePR()                                    │   │
│  │  - addPRComment()                                │   │
│  │  - getPRFiles()                                  │   │
│  │  - getPRCommits()                                │   │
│  └──────────────────────────────────────────────────┘   │
│                           │                             │
│                    ┌───────▼────────┐                    │
│                    │  GitHub API   │                    │
│                    │  (via HTTPS)  │                    │
│                    └───────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Data Models

#### PullRequest
```typescript
interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  merged: boolean;
  mergeable: boolean;
  mergeable_state: string;
  head: {
    ref: string;
    sha: string;
    repo: {
      full_name: string;
    };
  };
  base: {
    ref: string;
    sha: string;
  };
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  labels: Array<{
    name: string;
    color: string;
  }>;
  requested_reviewers: Array<{
    login: string;
    avatar_url: string;
  }>;
  reviews?: Array<Review>;
  comments?: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
}
```

#### Review
```typescript
interface Review {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  body: string;
  submitted_at: string;
}
```

### API Endpoints Used

1. `POST /repos/{owner}/{repo}/pulls` - Create PR
2. `GET /repos/{owner}/{repo}/pulls` - List PRs
3. `GET /repos/{owner}/{repo}/pulls/{pull_number}` - Get PR
4. `PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge` - Merge PR
5. `PATCH /repos/{owner}/{repo}/pulls/{pull_number}` - Update PR
6. `POST /repos/{owner}/{repo}/pulls/{pull_number}/comments` - Add comment
7. `GET /repos/{owner}/{repo}/pulls/{pull_number}/files` - Get PR files
8. `GET /repos/{owner}/{repo}/pulls/{pull_number}/commits` - Get PR commits
9. `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews` - Get PR reviews

### UI Components

#### 1. PRList Component
- Table/list view of all PRs
- Filters: status, author, label
- Sort options
- Quick actions: view, merge, close
- Status badges and indicators

#### 2. PRCreate Component
- Modal/form for creating PR
- Branch selector (current branch → target branch)
- Title and description inputs
- Reviewer selection
- Label selection
- Preview of changes (files, commits)

#### 3. PRReview Component
- PR header (title, status, metadata)
- Description panel
- Files changed list
- Diff viewer for selected file
- Comments section
- Review actions (approve, request changes, comment)
- Merge button (if authorized)

#### 4. PRMergeModal Component
- Merge strategy selector (merge, squash, rebase)
- Commit message input
- Delete branch option
- Confirmation and preview

### State Management

#### GitContext Additions
```javascript
// State
pullRequests: [],
currentPullRequest: null,
pullRequestLoading: false,
pullRequestError: null,

// Actions
loadPullRequests: (owner, repo, filters) => {},
createPullRequest: (owner, repo, prData) => {},
getPullRequest: (owner, repo, number) => {},
mergePullRequest: (owner, repo, number, mergeData) => {},
closePullRequest: (owner, repo, number) => {},
updatePullRequest: (owner, repo, number, updates) => {},
addPullRequestComment: (owner, repo, number, comment) => {},
```

### Repository Detection

- Parse `git remote -v` output
- Extract GitHub owner/repo from remote URL
- Support both HTTPS and SSH formats:
  - `https://github.com/owner/repo.git`
  - `git@github.com:owner/repo.git`
- Cache owner/repo per repository

## Implementation Checklist

### Phase 1: Foundation
- [x] Design document (this file)
- [ ] Create GitHubService class
- [ ] Add repository detection (owner/repo extraction)
- [ ] Add IPC handlers for PR operations
- [ ] Add PR state to GitContext

### Phase 2: Core PR Operations
- [ ] Implement createPullRequest
- [ ] Implement getPullRequests (list)
- [ ] Implement getPullRequest (single)
- [ ] Implement mergePullRequest
- [ ] Implement closePullRequest
- [ ] Implement updatePullRequest
- [ ] Implement addPullRequestComment
- [ ] Implement getPullRequestFiles
- [ ] Implement getPullRequestCommits
- [ ] Implement getPullRequestReviews

### Phase 3: UI Components
- [ ] PRList component (table/list view)
- [ ] PRCreate modal component
- [ ] PRReview component (detailed view)
- [ ] PRMergeModal component
- [ ] PR status badges and indicators
- [ ] PR quick actions menu

### Phase 4: Integration
- [ ] Add PR tab to GitClient
- [ ] Add "Create PR" button to branch actions
- [ ] Show PR status in branch list
- [ ] Add PR link in commit history
- [ ] Wire up all IPC calls
- [ ] Error handling and loading states

### Phase 5: Polish
- [ ] Loading states and skeletons
- [ ] Error messages and retry logic
- [ ] Success notifications
- [ ] Keyboard shortcuts
- [ ] Responsive design
- [ ] Dark mode support

## User Flow Examples

### Creating a PR
1. User is on feature branch
2. Clicks "Create Pull Request" from branch menu or PR tab
3. Modal opens with:
   - Current branch pre-selected as source
   - Base branch selector (defaults to main/master)
   - Title input (pre-filled with branch name)
   - Description textarea
   - Reviewer selector (optional)
   - Label selector (optional)
   - Preview of changes
4. User fills in details and clicks "Create"
5. PR is created and user is shown success message
6. Option to "View PR" or "Open on GitHub"

### Reviewing a PR
1. User opens PR tab
2. Sees list of PRs
3. Clicks on a PR to open review view
4. Sees:
   - PR header with metadata
   - Description
   - Files changed list
   - Can click file to see diff
   - Comments section
   - Review actions (if authorized)
5. Can add comments, approve, or request changes
6. Can merge if authorized and mergeable

### Merging a PR
1. User opens PR review
2. Clicks "Merge" button (if authorized and mergeable)
3. Merge modal opens:
   - Merge strategy selector
   - Commit message input
   - Delete branch checkbox
4. User confirms merge
5. PR is merged
6. Success message shown
7. Option to delete branch locally

## Error Handling

- Network errors: Show retry option
- Authentication errors: Prompt to re-authenticate
- Permission errors: Show clear message
- Merge conflicts: Show conflict details
- Invalid branch: Validate before creating PR
- Rate limiting: Show rate limit status

## Security Considerations

- Never store GitHub token in plain text (already using safeStorage)
- Validate all user inputs
- Sanitize PR descriptions and comments
- Handle sensitive data in PRs carefully
- Respect GitHub permissions (read/write)

## Future Enhancements

- PR templates
- Auto-assign reviewers based on file paths
- PR status checks integration
- Draft PRs
- PR review reminders
- PR notifications
- Compare branches without creating PR
- PR search and advanced filters
- PR analytics (time to merge, etc.)










