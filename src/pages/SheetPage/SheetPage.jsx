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
      nodes: {},
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

  // CSV export function
  exportToCSV = () => {
    const { nodes } = this.state;
    const data = this.transformToArray(nodes);

    const headers = ['Title', 'Description', 'Time Spent'];
    const rows = data.map(row => row.map(item => `"${item.value}"`).join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentProject}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Transform function
  transformToArray = (nodess) => {
    return Object.values(nodess).map((node) => [
      { value: node.title },
      { value: node.description },
      { value: node.timeSpent },
    ]);
  };

  render() {
    const { lokiLoaded, nodes } = this.state;
    let data = null;
    if (lokiLoaded) {
      data = this.transformToArray(nodes);
    }

    return lokiLoaded && data ? (
      <Layout>
        <h1 style={{ fontSize: 50 }}>{this.currentProject}'s Settings</h1>
        <span>Test</span>
        <Spreadsheet data={data} />
        <Button type="primary" onClick={this.exportToCSV} style={{ marginTop: 20 }}>
          Export to CSV
        </Button>
      </Layout>
    ) : (
      <Layout>
        <h1>Loading...</h1>
      </Layout>
    );
  }
}

export default SheetPage;
