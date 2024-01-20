// Libs
import React from 'react';
// Layouts
import Layout from '../../layouts/App';
// Components
import Path from '../../components/Home/Path';
import HelloWorld from '../../components/Home/HelloWorld';
import './Home.scss';

/**
 * Home
 *
 * @class Home
 * @extends {Component}
 */
function Home() {
  return (
    <Layout>
      <div className="home">
        <Path />
        <HelloWorld />
      </div>
    </Layout>
  );
}

export default Home;
