import React, { Component } from 'react';
import { Button } from 'antd';
import { ipcRenderer } from 'electron';
import Layout from '../../layouts/App';
import ProjectController from '../../api/project/ProjectController';

class ProjectSettings extends Component {
  constructor(props) {
    super(props);

    this.currentProject = localStorage.getItem('currentProject');
    this.trelloToken = localStorage.getItem('trelloToken');
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    this.authLink = `https://trello.com/1/authorize?expiration=1day&scope=read&response_type=token&key=${this.trelloKey}`;

    this.state = {
      boards: [],
      lokiLoaded: false,
      selectedBoard: '',
    };
  }

  componentDidMount() {
    const newState = ipcRenderer.sendSync(
      'api:initializeProjectState',
      this.projectName,
    );

    this.setState({
      ...this.state,
      ...newState,
    });
  }

  displayAvailableBoards = () => {
    fetch(
      `https://api.trello.com/1/members/me/boards?key=${this.trelloKey}&token=${this.trelloToken}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    )
      .then((response) => {
        return response.text();
      })
      .then((text) => {
        console.log(JSON.parse(text));
        const newState = {
          ...this.state,
          boards: JSON.parse(text),
        };
        this.setState(newState);
      })
      .catch((err) => console.error(err));
  };

  setSelectedBoard = (board) => {
    const newState = {
      ...this.state,
      selectedBoard: board.name,
    };
    this.setState(newState);

    ProjectController.setTrelloBoard(board);
  };

  handleAuthApp = () => {
    // open trello auth link
    window.open(this.authLink, '_blank');
  };

  render() {
    const { boards, lokiLoaded, projectSettings, selectedBoard } = this.state;
    let boardName = selectedBoard;

    if (lokiLoaded) {
      boardName = projectSettings?.trello?.name || selectedBoard;
    }
    console.log(this.state);

    return lokiLoaded ? (
      <Layout>
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        <h1 style={{ fontSize: 50 }}>{this.currentProject}'s Settings</h1>
        <span>Synced trello board: {boardName}</span>
        <Button onClick={this.handleAuthApp}>Auth trello</Button>
        {this.trelloToken && (
          <Button onClick={this.displayAvailableBoards}>Display Boards</Button>
        )}
        <div>
          {boards.map((board) => (
            <div key={board.id}>
              <Button onClick={() => this.setSelectedBoard(board)}>
                {board.name}
              </Button>
            </div>
          ))}
        </div>
      </Layout>
    ) : (
      <Layout>
        <h1>Loading...</h1>
      </Layout>
    );
  }
}

export default ProjectSettings;
