// Libs
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import PropTypes from 'prop-types';
import ProjectList from './ProjectItems/ProjectList';
import './ProjectListContainer.scss';
import ProjectController from '../../api/project/ProjectController';

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
      localStorage.setItem(`projectLastOpened_${fileName}`, Date.now().toString());
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

  // eslint-disable-next-line class-methods-use-this
  openProjectFile = () => {
    ipcRenderer.send('GetProjectFile');
  };

  render() {
    const { items } = this.state;
    const { openProjectDetails } = this.props;

    return (
      <div className="todoListMain flex-none mr-8">
        <button onClick={this.openProjectFile} type="button">
          Open File
        </button>
        <ProjectList
          items={items}
          deleteProject={this.deleteProject}
          renameProject={this.renameProject}
          openProjectDetails={(name) => {
            // Update last opened time before opening project
            const lastOpened = JSON.parse(localStorage.getItem('projectLastOpened') || '{}');
            // Store with .json extension to match the file name
            lastOpened[name + '.json'] = Date.now();
            localStorage.setItem('projectLastOpened', JSON.stringify(lastOpened));
            openProjectDetails(name);
          }}
        />
      </div>
    );
  }
}

ProjectListContainer.propTypes = {
  openProjectDetails: PropTypes.func.isRequired,
};

export default ProjectListContainer;
