// Libs
import React, { Component } from 'react';
// Styles
import './Dashboard.scss';
// Layouts
import Layout from '../../layouts/App';
// Components
import Path from '../../components/Projects/Path';
import ProjectListContainer from '../../components/Projects/ProjectListContainer';

/**
 * Home
 *
 * @class Dashboard
 * @extends {Component}
 */
function Dashboard() {
  return (
    <Layout>
      <div className="home">
        <Path />
        <ProjectListContainer />
      </div>
    </Layout>
  );
}

export default Dashboard;
