// Libs
import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
// Screens
import TimerPage from '../pages/Timer/TimerPage';

const TimerRoutes = () => (
  <HashRouter>
    <Switch>
      <Route exact path="/" component={TimerPage} />
    </Switch>
  </HashRouter>
);

export default TimerRoutes;
