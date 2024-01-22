// Libs
import React, {Component} from 'react';
import {ipcRenderer} from 'electron';
import {withRouter} from 'react-router-dom';

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
    ipcRenderer.on('IsDev', function () {
      self.getProjects();
    });
  }

  componentDidMount() {
    this.getProjects();
    const self = this;

    ipcRenderer.on('ReturnProjectFile', function (e, fileName) {
      if (!fileName) return;
      // if filename contains slashes either forward or backward, replace them @ symbols
      // eslint-disable-next-line no-param-reassign
      fileName = fileName.toString().replace(/[/\\]/g, '@');
      self.props.history.push(`/projectpage/${fileName}`);
      console.log(fileName);
    });
  }

  getProjects = (isDev) => {
    const items = ProjectController.getProjects(isDev);
    this.setState({items});
  };

  renameProject = (oldName, newName) => {
    if (!this.isProjectNameValid(newName)) {
      return;
    }

    ProjectController.renameProject(oldName, newName);
    this.getProjects();
  };

  isProjectNameValid = (projectName) => {
    if (!projectName) {
      return false;
    }

    const invalidRegex = new RegExp('\\\\+|/+');
    if (invalidRegex.test(projectName)) {
      return false;
    }

    const {items} = this.state;
    let isDuplicateProject = false;
    items.forEach((item) => {
      if (`${projectName}.json` === item.text || projectName === item.text) {
        isDuplicateProject = true;
      }
    });

    return !isDuplicateProject;
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
    const {items} = this.state;
    const {openProjectDetails} = this.props;

    return (
      <div className="todoListMain flex-none mr-8">
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

export default withRouter(ProjectListContainer);
