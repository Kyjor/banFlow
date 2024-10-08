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
          openProjectDetails={openProjectDetails}
        />
      </div>
    );
  }
}

ProjectListContainer.propTypes = {
  openProjectDetails: PropTypes.func.isRequired,
};

export default ProjectListContainer;
