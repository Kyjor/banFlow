import React, { useState, useEffect } from 'react';
import AppRoutes from './routes/Root';
import TimerRoot from './routes/TimerRoot';
import pluginHost from './plugins/host/PluginHost';
import PluginChrome from './plugins/host/ui/PluginChrome';

const App = AppRoutes;
const Timer = TimerRoot;

const ViewManager = () => {
  const [viewName, setViewName] = useState(() => {
    // Initial check
    const location = window.location.href;
    if (location.includes('timer') || location.includes('#/timer')) {
      return 'timer';
    }
    return 'app';
  });

  useEffect(() => {
    void pluginHost.init();
  }, []);

  useEffect(() => {
    // Listen for URL changes to update the view
    const handleUrlChange = () => {
      const location = window.location.href;
      const search = window.location.search;
      if (location.includes('timer') || search.includes('timer') || location.includes('#/timer')) {
        setViewName('timer');
      } else {
        setViewName('app');
      }
    };

    // Expose function for external navigation scripts
    window.updateViewManager = handleUrlChange;

    // Listen to multiple events to catch all URL changes
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    // Also check on load in case URL was set before component mounted
    handleUrlChange();
    
    // Poll for URL changes as a fallback (in case events don't fire)
    // Use a longer interval to avoid performance issues
    const interval = setInterval(handleUrlChange, 200);

    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(interval);
      delete window.updateViewManager;
    };
  }, []);

  const Views = {
    app: <App />,
    timer: <Timer />,
  };

  const view = Views[viewName];
  if (view == null) throw new Error(`View '${viewName}' is undefined`);

  return (
    <>
      {view}
      <PluginChrome />
    </>
  );
};

export default ViewManager;
