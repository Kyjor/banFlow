import React from 'react';
import AppRoutes from './routes/Root';
import TimerRoot from './routes/TimerRoot';
import { useLocation } from 'react-router-dom';

const App = AppRoutes;
const Timer = TimerRoot;

const ViewManager = () => {
  const location = window.location.href; // Get the current URL

  // Check for 'app' or 'timer' in the query parameters
  let viewName = 'app'; // Default to 'app'
  if (location.includes('timer')) {
    viewName = 'timer';
  } else if (location.includes('app')) {
    viewName = 'app';
  }

  const Views = {
    app: <App />,
    timer: <Timer />,
  };

  const view = Views[viewName];
  if (view == null) throw new Error(`View '${viewName}' is undefined`);

  return view;
};

export default ViewManager;
