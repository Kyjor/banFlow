import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import MDEditor from '@uiw/react-md-editor';
import Layout from '../../layouts/App';
import '@uiw/react-md-editor/markdown-editor.css';

class TextEditor extends Component {
  constructor(props) {
    super(props);

    this.currentProject = localStorage.getItem('currentProject');
    this.trelloToken = localStorage.getItem('trelloToken');
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    this.authLink = `https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key=${this.trelloKey}`;

    this.state = {
      boards: [],
      lokiLoaded: false,
      text: '',
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

  setValue = (value) => {
    const newState = {
      ...this.state,
      text: value,
    };

    this.setState(newState);
  };

  render() {
    const { lokiLoaded, nodes } = this.state;
    if (lokiLoaded) {
    }

    return lokiLoaded ? (
      <Layout>
        <div className="container">
          <MDEditor value={this.state.text} onChange={this.setValue} />
          <MDEditor.Markdown
            source={this.state.text}
            style={{ whiteSpace: 'pre-wrap' }}
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

export default TextEditor;
