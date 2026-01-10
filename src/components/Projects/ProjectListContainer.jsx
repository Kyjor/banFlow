// Libs
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import PropTypes from 'prop-types';
import { Input, Select, Space, Button, message } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import ProjectList from './ProjectItems/ProjectList';
import './ProjectListContainer.scss';
import ProjectController from '../../api/project/ProjectController';

const { Option } = Select;

/**
 * ProjectList
 *
 * @class ProjectListContainer
 * @extends {Component}
 */
class ProjectListContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      searchQuery: '',
      sortBy: 'lastOpened',
      newProjectName: '',
      isCreating: false,
    };

    const self = this;
    ipcRenderer.on('IsDev', () => {
      self.getProjects();
    });
  }

  componentDidMount() {
    this.getProjects();
    const self = this;

    ipcRenderer.on('ReturnProjectFile', (e, fileName) => {
      if (!fileName) return;
      localStorage.setItem(
        `projectLastOpened_${fileName}`,
        Date.now().toString(),
      );
      self.props.openProjectDetails(fileName);
    });
  }

  getProjects = () => {
    const items = ProjectController.getProjects();
    this.setState({ items });
  };

  renameProject = (oldName, newName) => {
    ProjectController.renameProject(oldName, newName);
    this.getProjects();
  };

  deleteProject = (name) => {
    ProjectController.deleteProject(name);
    this.getProjects();
  };

  handleSearch = (e) => {
    this.setState({ searchQuery: e.target.value });
  };

  handleSortChange = (value) => {
    this.setState({ sortBy: value });
  };

  handleCreateProject = async (e) => {
    e.preventDefault();
    const { newProjectName } = this.state;

    if (!newProjectName || !newProjectName.trim()) {
      message.warning('Please enter a project name');
      return;
    }

    this.setState({ isCreating: true });
    const created = ProjectController.createProject(newProjectName.trim());

    if (created) {
      message.success(
        `Project "${newProjectName.trim()}" created successfully!`,
      );
      this.setState({ newProjectName: '' });
      this.getProjects();
    } else {
      message.error('Failed to create project. Please check the project name.');
    }

    this.setState({ isCreating: false });
  };

  handleNewProjectNameChange = (e) => {
    this.setState({ newProjectName: e.target.value });
  };

  // eslint-disable-next-line class-methods-use-this
  openProjectFile = () => {
    ipcRenderer.send('GetProjectFile');
  };

  getFilteredAndSortedItems = () => {
    const { items, searchQuery, sortBy } = this.state;

    // System files to exclude
    const systemFiles = ['.ds_store', 'thumbs.db', '.gitignore', '.gitkeep'];

    // First, filter and extract project names
    const projectMap = new Map(); // Use Map to deduplicate by project name

    items.forEach((item) => {
      const fileName = item.text;

      // Only include files that end with .json (not .json~ backup files)
      if (!fileName.endsWith('.json') || fileName.endsWith('.json~')) {
        return;
      }

      // Extract project name (remove .json extension)
      const projectName = fileName.slice(0, fileName.lastIndexOf('.json'));

      // Filter out empty or whitespace-only project names
      if (!projectName || !projectName.trim()) {
        return;
      }

      const trimmedName = projectName.trim();
      const lowerName = trimmedName.toLowerCase();

      // Filter out system files
      if (systemFiles.includes(lowerName)) {
        return;
      }

      // Deduplicate - keep first occurrence, but update if we find a newer one (based on file name)
      if (!projectMap.has(lowerName)) {
        projectMap.set(lowerName, {
          ...item,
          projectName: trimmedName,
          originalKey: item.key,
        });
      } else {
        // If duplicate found, keep the one with the most recent key (timestamp)
        const existing = projectMap.get(lowerName);
        if (item.key > existing.originalKey) {
          projectMap.set(lowerName, {
            ...item,
            projectName: trimmedName,
            originalKey: item.key,
          });
        }
      }
    });

    // Convert back to array and apply search filter
    let filtered = Array.from(projectMap.values()).filter((item) => {
      return item.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Sort items
    filtered = filtered.sort((a, b) => {
      const nameA = a.projectName;
      const nameB = b.projectName;

      if (sortBy === 'name') {
        return nameA.localeCompare(nameB);
      }

      if (sortBy === 'lastOpened') {
        const lastOpenedA = localStorage.getItem(
          `projectLastOpened_${nameA.trim()}`,
        );
        const lastOpenedB = localStorage.getItem(
          `projectLastOpened_${nameB.trim()}`,
        );
        const timeA = lastOpenedA ? parseInt(lastOpenedA, 10) : 0;
        const timeB = lastOpenedB ? parseInt(lastOpenedB, 10) : 0;
        return timeB - timeA; // Newest first
      }

      // Default: creation date (using file modification time would require fs access)
      return 0;
    });

    return filtered;
  };

  render() {
    const { searchQuery, sortBy, newProjectName, isCreating } = this.state;
    const { openProjectDetails, selectedProject } = this.props;
    const filteredItems = this.getFilteredAndSortedItems();

    return (
      <div className="project-list-container">
        <div className="project-list-header">
          <h2 className="project-list-title">Projects</h2>

          {/* Create Project Form */}
          <form
            onSubmit={this.handleCreateProject}
            className="create-project-form"
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={this.handleNewProjectNameChange}
                prefix={<PlusOutlined />}
                size="large"
                disabled={isCreating}
              />
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                size="large"
                loading={isCreating}
              >
                Create
              </Button>
            </Space.Compact>
          </form>

          {/* Search and Sort Controls */}
          <div className="project-list-controls">
            <Input
              placeholder="Search projects..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={this.handleSearch}
              allowClear
              className="search-input"
            />
            <Select
              value={sortBy}
              onChange={this.handleSortChange}
              className="sort-select"
            >
              <Option value="lastOpened">Last Opened</Option>
              <Option value="name">Name (A-Z)</Option>
            </Select>
          </div>

          {/* Open File Button */}
          <Button
            icon={<FolderOpenOutlined />}
            onClick={this.openProjectFile}
            className="open-file-button"
          >
            Open Existing File
          </Button>
        </div>

        <ProjectList
          items={filteredItems}
          deleteProject={this.deleteProject}
          renameProject={this.renameProject}
          selectedProject={selectedProject}
          openProjectDetails={(name) => {
            // Update last opened time before opening project
            localStorage.setItem(
              `projectLastOpened_${name}`,
              Date.now().toString(),
            );
            openProjectDetails(name);
          }}
        />
      </div>
    );
  }
}

ProjectListContainer.propTypes = {
  openProjectDetails: PropTypes.func.isRequired,
  selectedProject: PropTypes.string,
};

ProjectListContainer.defaultProps = {
  selectedProject: '',
};

export default ProjectListContainer;
