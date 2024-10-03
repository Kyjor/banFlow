import React, { Component } from 'react';
import { Button } from 'antd';
import { ipcRenderer } from 'electron';
import Spreadsheet from 'react-spreadsheet';
import Layout from '../../layouts/App';
import ReactDOM from 'react-dom';
import { Flowchart } from '@ant-design/flowchart';

const createLink = (src) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.className = 'dynamic-link';
  link.href = src;
  document.getElementsByTagName('head')[0].appendChild(link);
};
createLink('https://unpkg.com/antd@4.24.3/dist/antd.css');
createLink('https://unpkg.com/@ant-design/flowchart@1.2.1/dist/index.css');

class SheetPage extends Component {
  constructor(props) {
    super(props);

    this.currentProject = localStorage.getItem('currentProject');
    this.trelloToken = localStorage.getItem('trelloToken');
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    this.authLink = `https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key=${this.trelloKey}`;

    this.state = {
      lokiLoaded: false,
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



  render() {
    const { lokiLoaded } = this.state;

    return lokiLoaded ? (
      <Layout>
        <h1 style={{ fontSize: 50 }}>{this.currentProject}'s Settings</h1>
        <span>Test</span>
        <div style={{ height: 600 }}>
          <Flowchart
            onSave={(d) => {
              console.log(d, JSON.stringify(d));
            }}
            toolbarPanelProps={{
              position: {
                top: 0,
                left: 0,
                right: 0,
              },
            }}
            scaleToolbarPanelProps={{
              layout: 'horizontal',
              position: {
                right: 0,
                top: -40,
              },
              style: {
                width: 150,
                height: 39,
                left: 'auto',
                background: 'transparent',
              },
            }}
            canvasProps={{
              position: {
                top: 40,
                left: 0,
                right: 0,
                bottom: 0,
              },
            }}
            nodePanelProps={{
              position: { width: 160, top: 40, bottom: 0, left: 0 },
            }}
            detailPanelProps={{
              position: { width: 200, top: 40, bottom: 0, right: 0 },
            }}
          />
        </div>
      </Layout>
    ) : (
      <Layout>
        <h1>Loading...</h1>
      </Layout>
    );
  }
}

export default SheetPage;
