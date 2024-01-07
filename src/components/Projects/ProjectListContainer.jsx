// Libs
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import { withRouter } from 'react-router-dom';

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
    ipcRenderer.on('IsDev', function (event, isDev) {
      self.getProjects();
    });
  }

  componentDidMount = () => {
    this.getProjects();
    ipcRenderer.on('ReturnProjectFile', function (e, fileName) {
      if (!fileName) return;
      // if filename contains slashes either forward or backward, replace them @ symbols
      fileName = fileName.toString().replace(/[/\\]/g, '@');
      self.props.history.push(`/projectpage/${fileName}`);
      console.log(fileName);
    });
  };

  getProjects = (isDev) => {
    const items = ProjectController.getProjects(isDev);
    this.setState({ items });
  };

  addProject = (e) => {
    e.preventDefault();
    const projectName = this._inputElement.value;
    this._inputElement.value = '';

    if (!this.isProjectNameValid(projectName)) return;

    ProjectController.createProject(projectName);
    this.getProjects();
  };

  renameProject = (oldName, newName) => {
    if (!this.isProjectNameValid(newName)) {
      return;
    }

    ProjectController.renameProject(oldName, newName);
    this.getProjects();
  };

  isProjectNameValid = (projectName) => {
    let isDuplicateProject = false;
    this.state.items.forEach((item) => {
      if (`${projectName}.json` == item.text || projectName == item.text) {
        isDuplicateProject = true;
      }
    });
    if (isDuplicateProject || !projectName) {
      return false;
    }
    return true;
  };

  deleteProject = (name) => {
    ProjectController.deleteProject(name);
    this.getProjects();
  };

  openProjectFile = () => {
    ipcRenderer.send('GetProjectFile');
  };

  render() {
    return (
      <>
        <div className="todoListMain">
          <div className="header">
            <form onSubmit={this.addProject}>
              <input
                ref={(a) => (this._inputElement = a)}
                placeholder="Create new project"
              />
              <button type="submit">+</button>
              <button onClick={this.openProjectFile}>Open File</button>
            </form>
          </div>
          <ProjectList
            items={this.state.items}
            deleteProject={this.deleteProject}
            renameProject={this.renameProject}
          />
        </div>
      </>
    );
  }
}

export default withRouter(ProjectListContainer);
