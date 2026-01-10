import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import MDEditor from '@uiw/react-md-editor';
import Layout from '../../layouts/App';
import '@uiw/react-md-editor/markdown-editor.css';

class TextEditor extends Component {
  constructor(props) {
    super(props);

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

    this.setState(newState);
  }

  setValue = (value) => {
    const newState = {
      ...this.state,
      text: value,
    };

    this.setState(newState);
  };

  render() {
    const { lokiLoaded, text } = this.state;

    return lokiLoaded ? (
      <Layout>
        <div className="container">
          <MDEditor value={text} onChange={this.setValue} />
          <MDEditor.Markdown source={text} style={{ whiteSpace: 'pre-wrap' }} />
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
