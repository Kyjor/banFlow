// Libs
import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
// Pages
import Dashboard from '../pages/Dashboard/Dashboard';
import ProjectPage from '../pages/ProjectPage/ProjectPage';

function Routes() {
  return (
    <HashRouter>
      <Switch>
        <Route exact path="/" component={Dashboard} />
        <Route exact path="/dashboard" component={Dashboard} />
        <Route exact path="/projectPage/:name" component={ProjectPage} />
      </Switch>
    </HashRouter>
  );
}

export default Routes;
