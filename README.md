# banFlow: Kanban and Time Tracking Made Easy
*Beware: this project is in a VERY early state and I would not recommend using it yet for an actual project. You may lose all data.*

**banFlow** is a desktop Electron application that combines project management with integrated time tracking. It's designed to be an all-in-one solution for individuals who want to manage their tasks, track time, and maintain documentation without needing separate tools like a Kanban board and Excel spreadsheets.

## Core Features

### 1. Kanban Board Management
- **Drag-and-drop Kanban interface** with customizable columns (Parents) and task cards (Nodes)
- **Task hierarchy**: Parents (columns) → Nodes (individual tasks)
- **Flexible organization**: Create, edit, delete, and reorder tasks and columns
- **Visual workflow management**: Move tasks between columns to track progress

### 2. Time Tracking
- **Built-in timer** for each task
- **Granular time tracking**: Track time spent on individual tasks
- **Time analytics and reporting**: View time spent across projects, tasks, and sessions
- **Session tracking**: Monitor work sessions with start/stop functionality
- **Time history**: Historical data on time spent per task

### 3. Project Management
- **Multiple projects**: Manage multiple projects simultaneously
- **Project settings**: Configure project metadata, tags, and properties
- **Project health metrics**: Track project status and completion rates
- **Aggregate view**: View statistics across multiple projects
- **Project comparison**: Compare time and metrics between projects

### 4. Documentation System
- **Built-in markdown editor** (DocsPage) with live preview
- **Document management**: Create, edit, and organize documents in folders
- **Cross-referencing**: Link between documents using `[[document name]]` syntax
- **Image gallery**: Attach and manage images within documents
- **Backlinks and references**: Automatically track document relationships
- **Mention system**: Reference nodes and parents using `@mentions`
- **Templates**: Pre-built document templates for common use cases

### 5. Git Integration
- **Git repository management**: View and manage Git repositories
- **Enhanced diff viewer**: Syntax-highlighted code diffs with side-by-side comparison
- **Custom diff views**: 
  - Image diff viewer for image files
  - Aseprite file diff viewer with image previews and property comparisons
- **Pull request management**: Create and review GitHub pull requests (planned/partial)
- **Branch management**: View and switch between Git branches
- **Commit history**: Browse commit history and file changes

### 6. Analytics & Reporting
- **Time analytics dashboard**: Comprehensive time tracking analytics
- **Project statistics**: Metrics on project completion, time spent, and progress
- **Charts and visualizations**: Visual representation of time and productivity data
- **Time forecasting**: Predict future time requirements based on historical data
- **Session statistics**: Average session duration, longest/shortest sessions
- **Activity heatmaps**: Visual representation of work activity over time

### 7. Additional Features
- **Spreadsheet View** (SheetPage): Tabular data view for structured information
- **Chart View**: Visual data representation and graphing
- **Iterations**: Sprint/iteration tracking for agile workflows
- **Tags**: Categorize and filter tasks using tags
- **Metadata Management**: Custom fields and properties for tasks and projects
- **Timer View**: Standalone timer interface for focused work sessions
- **Game Mode**: Gamification features to make work more engaging

## Technical Architecture

- **Frontend**: React with Ant Design UI components
- **Backend**: Electron main process with IPC (Inter-Process Communication)
- **Data Storage**: LokiJS (in-memory database) for local data persistence
- **File Handling**: Custom services for Git operations, Aseprite files, images, etc.
- **Build System**: Webpack with TypeScript support
- **State Management**: React component state with IPC for main/renderer communication

## Use Case

banFlow is designed for:
- **Individual developers** who want to track time on tasks
- **Small teams** needing project management without external tools
- **Anyone** who wants a unified solution combining:
  - Task management (Kanban)
  - Time tracking
  - Project documentation
  - Git workflow integration
  - Analytics and reporting

## Current Status

⚠️ **Early Development**: The application is in a very early state. Data loss is possible, and it's not recommended for production use yet.

## Key Differentiators

1. **Integrated Time Tracking**: Unlike separate Kanban boards, banFlow tracks time directly on tasks
2. **Desktop Application**: Native Electron app with full system integration
3. **Git-First**: Built-in Git client with enhanced diff viewing
4. **Documentation Hub**: Markdown editor with cross-referencing and backlinks
5. **All-in-One**: Combines multiple tools (Kanban, time tracking, docs, Git) in one interface

## File Structure Highlights

- `/src/pages/`: Main application pages (Dashboard, ProjectPage, DocsPage, Git, Analytics, etc.)
- `/src/components/`: Reusable UI components (KanbanBoard, Timer, NodeModal, etc.)
- `/src/services/`: Business logic services (GitService, TimerService, NodeService, etc.)
- `/src/main/`: Electron main process code
- `/src/api/`: API controllers for data operations

## License

banFlow is copyright, All Rights Reserved, Kyjor, LLC 2024.

Feel free to use the program itself in the development of projects, commercial or personal. You can also build banFlow yourself and use it freely for personal reasons. Please do not distribute builds of banFlow to others.


## Screenshots
Project dashboard:
<img width="2560" height="1408" alt="Screenshot From 2026-02-16 14-24-30" src="https://github.com/user-attachments/assets/0a0a98b0-2c31-4a82-b829-f09086d52527" />
<br/>
Kanban board:
<img width="2560" height="1408" alt="Screenshot From 2026-02-16 14-20-47" src="https://github.com/user-attachments/assets/5fc73d48-d7ee-4438-954d-c5cc1f365a74" />
<br/>
Node editor:
<img width="2560" height="1408" alt="Screenshot From 2026-02-16 14-23-08" src="https://github.com/user-attachments/assets/10f63357-fbca-4c33-b540-c1f513003577" />
<img width="2560" height="1408" alt="image" src="https://github.com/user-attachments/assets/ac62c2dd-7387-4ce1-b7ad-ebd2e78ea6e3" />

<br/>
Project table (with export to excel):
<img width="2560" height="1408" alt="Screenshot From 2026-02-16 14-20-54" src="https://github.com/user-attachments/assets/1e2015a4-4102-4b87-8eaf-6b75e6cbddd5" />
<br/>
Analytics page:
<img width="2560" height="1408" alt="Screenshot From 2026-02-16 14-21-06" src="https://github.com/user-attachments/assets/4b6e25fd-50f2-443f-b7ed-a2051df8dc2c" />
<br/>
Markdown document editor and reader:
<img width="2560" height="1408" alt="Screenshot From 2026-02-16 14-22-08" src="https://github.com/user-attachments/assets/a5a1034d-a04f-4022-a727-b1f93708af11" />
<br/>
Project settings:
<img width="2560" height="1408" alt="Screenshot From 2026-02-16 14-22-29" src="https://github.com/user-attachments/assets/c2018cda-fec3-4fa9-930a-496067ee4ea5" />


## License
banFlow is copyright, All Rights Reserved, Kyjor, LLC 2024.

Feel free to use the program itself in the development of projects, commercial or personal. You can also build banFlow yourself and use it freely for personal reasons. Please also do not distribute builds of banFlow to others.
