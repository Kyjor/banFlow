import React, { Component } from 'react';
import { Button } from 'antd';
import Layout from '../../layouts/App';
import APIKeyInput from "../../components/APIKeyInput/APIKeyInput";

class AppSettings extends Component {
  constructor(props) {
    super(props);

    this.currentProject = localStorage.getItem('currentProject');
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    this.authLink = `https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key=${this.trelloKey}`;

  }

  handleAuthApp = () => {
    // open trello auth link
    window.open(this.authLink, '_blank');
  };

  render() {
    return (
      <Layout>
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        <h1 style={{ fontSize: 50 }}>App Settings</h1>
        <Button onClick={this.handleAuthApp}>Auth trello</Button>
        <APIKeyInput />
      </Layout>
    );
  }
}

export default AppSettings;
