// Libs
import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
// Pages
import Dashboard from '../pages/Dashboard/Dashboard';
import ProjectPage from '../pages/ProjectPage/ProjectPage';
import NotFound from '../pages/NotFound/NotFound';
// import TextEditor from '../components/TextEditor/TextEditor';

function Routes() {
  return (
    <HashRouter>
      <Switch>
        <Route exact path="/" component={Dashboard} />
        <Route exact path="/dashboard" component={Dashboard} />
        <Route exact path="/projectPage/:name" component={ProjectPage} />
        <Route component={NotFound} /> {/* Default 404 route */}
        {/* <Route exact path="/docs/:name" component={TextEditor} /> */}
      </Switch>
    </HashRouter>
  );
}

export default Routes;
