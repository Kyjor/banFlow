import React from 'react';
import AppRoutes from './routes/Root';
import TimerRoot from './routes/TimerRoot';
import { useLocation } from 'react-router-dom';

const App = AppRoutes;
const Timer = TimerRoot;

const ViewManager = () => {
  const location = window.location.href; // Get the current URL

  // Check for 'app' or 'timer' in the query parameters
  let viewName = '';
  if (location.includes('app')) {
    viewName = 'app';
  } else if (location.includes('timer')) {
    viewName = 'timer';
  }

  const Views = {
    app: <App />,
    timer: <Timer />,
  };

  const view = Views[viewName];
  if (view == null) throw new Error(`View '${name}' is undefined`);

  return view;
};

export default ViewManager;
