import React, { Component } from 'react';
import { Button } from 'antd';
import { ipcRenderer } from 'electron';
import Spreadsheet from 'react-spreadsheet';
import Layout from '../../layouts/App';

class SheetPage extends Component {
  constructor(props) {
    super(props);

    this.currentProject = localStorage.getItem('currentProject');
    this.trelloToken = localStorage.getItem('trelloToken');
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    this.authLink = `https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key=${this.trelloKey}`;

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

  render() {
    const { lokiLoaded, nodes } = this.state;

    // const data = [
    //   [{ value: "Vanilla" }, { value: "Chocolate" }],
    //   [{ value: "Strawberry" }, { value: "Cookies" }],
    // ];

    // Transform function
    const transformToArray = (nodess) => {
      return Object.values(nodess).map((node) => [
        // { value: node.id },
        { value: node.title },
        { value: node.description },
        { value: node.timeSpent },
        // { value: node.parent },
        // { value: node.isComplete },
        // { value: node.created },
        // { value: node.estimatedTime },
        // { value: node.estimatedDate },
        // { value: node.completedDate },
        // { value: node.iterationId },
      ]);
    };

    let data = null;
    if (lokiLoaded) {
      data = transformToArray(nodes);
    }

    return lokiLoaded && data ? (
      <Layout>
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        <h1 style={{ fontSize: 50 }}>{this.currentProject}'s Settings</h1>
        <span>Test</span>
        <Spreadsheet data={data} />
      </Layout>
    ) : (
      <Layout>
        <h1>Loading...</h1>
      </Layout>
    );
  }
}

export default SheetPage;
